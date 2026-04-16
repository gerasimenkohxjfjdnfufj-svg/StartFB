import uuid
import asyncio
import httpx
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2.shape import from_shape
from shapely.geometry import LineString, Point
from app.core.config import settings
from app.core.cache import cache_get, cache_set, make_key
from app.models.route import Route, RouteRating
from app.models.user import User
from app.schemas.route import BuildRouteRequest, RouteResponse, RateRouteRequest


# Скорость ходьбы по профилям (км/ч)
PROFILE_SPEED = {
    "wheelchair": 3.0,
    "elderly":    2.5,
    "stroller":   3.2,
    "visually":   3.5,
}


class RouteService:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def build(self, body: BuildRouteRequest, user: Optional[User], quick: bool = False) -> RouteResponse:
        """Построить маршрут через OSRM + проверить барьеры через Overpass."""

        # 1. Запрос к OSRM (с кешем на 24 часа)
        osrm_cache_key = make_key(
            "osrm",
            round(body.from_point.lat, 5), round(body.from_point.lng, 5),
            round(body.to_point.lat, 5), round(body.to_point.lng, 5),
        )
        osrm_data = await cache_get(osrm_cache_key)

        if osrm_data is None:
            coords = f"{body.from_point.lng},{body.from_point.lat};{body.to_point.lng},{body.to_point.lat}"
            osrm_url = f"{settings.OSRM_URL}/route/v1/foot/{coords}"

            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(osrm_url, params={
                    "overview": "full",
                    "geometries": "geojson",
                    "steps": "true",
                })
                resp.raise_for_status()
                osrm_data = resp.json()

            await cache_set(osrm_cache_key, osrm_data, ttl=86400)  # 24 hours

        if not osrm_data.get("routes"):
            raise Exception("OSRM не вернул маршрут")

        route_data = osrm_data["routes"][0]
        geometry_coords = route_data["geometry"]["coordinates"]  # [[lng, lat], ...]
        distance_m = int(route_data["distance"])

        # Скорость по профилю
        speed_kmh = PROFILE_SPEED.get(body.profile, 3.5)
        duration_sec = int((distance_m / 1000) / speed_kmh * 3600)

        # 2. Проверка барьеров через Overpass (пропускаем в quick-режиме)
        if quick:
            barriers_list: list = []
            score = 75
        else:
            lats = [c[1] for c in geometry_coords]
            lngs = [c[0] for c in geometry_coords]
            south, north = min(lats), max(lats)
            west,  east  = min(lngs), max(lngs)

            barriers_list, score = await self._check_barriers(
                geometry_coords, south, west, north, east, body.profile
            )

        # 3. Сохранить маршрут в БД (только для авторизованных пользователей)
        route_id = str(uuid.uuid4())
        barriers_counts = {b["type"]: barriers_list.count(b) for b in barriers_list}
        if user is not None:
            line = LineString(geometry_coords)
            route = Route(
                user_id=user.id,
                profile_type=body.profile,
                from_address=body.from_address or "",
                to_address=body.to_address or "",
                from_point=from_shape(Point(body.from_point.lng, body.from_point.lat), srid=4326),
                to_point=from_shape(Point(body.to_point.lng, body.to_point.lat), srid=4326),
                geometry=from_shape(line, srid=4326),
                distance_m=distance_m,
                duration_sec=duration_sec,
                accessibility_score=score,
                barriers_found=barriers_counts,
            )
            self.db.add(route)
            await self.db.flush()
            route_id = str(route.id)

        return RouteResponse(
            route_id=route_id,
            distance_m=distance_m,
            duration_sec=duration_sec,
            accessibility_score=score,
            geometry={"type": "LineString", "coordinates": geometry_coords},
            barriers=barriers_list,
        )

    async def _check_barriers(
        self, coords: list, south, west, north, east, profile: str
    ) -> tuple[list, int]:
        """Запросить барьеры из OSM и рассчитать оценку доступности."""
        import urllib.parse

        # Округляем bbox до 3 знаков (~111м точность) для лучшего кеш-хита
        s, w, n, e = round(south, 3), round(west, 3), round(north, 3), round(east, 3)
        overpass_cache_key = make_key("overpass", s, w, n, e)
        data = await cache_get(overpass_cache_key)

        if data is None:
            bbox = f"{south},{west},{north},{east}"
            query = f"""
[out:json][timeout:20];
(
  node["highway"="steps"]({bbox});
  way["highway"="steps"]({bbox});
  node["barrier"="kerb"]["kerb"!="lowered"]["kerb"!="flush"]({bbox});
  node["highway"="crossing"]({bbox});
  node["amenity"="elevator"]({bbox});
  way["ramp"="yes"]({bbox});
  way["surface"="cobblestone"]({bbox});
  way["surface"="sett"]({bbox});
);
out center;
"""
            encoded = urllib.parse.quote(query)
            mirrors = [
                settings.OVERPASS_URL,
                "https://overpass-api.de/api/interpreter",
                "https://overpass.kumi.systems/api/interpreter",
            ]

            async def _try_mirror(url: str) -> dict | None:
                try:
                    async with httpx.AsyncClient(timeout=12.0) as c:
                        r = await c.get(f"{url}?data={encoded}")
                        if r.status_code == 200:
                            return r.json()
                except Exception:
                    pass
                return None

            tasks = [asyncio.create_task(_try_mirror(m)) for m in mirrors]
            data = None
            pending = set(tasks)
            while pending and data is None:
                done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
                for t in done:
                    result = t.result()
                    if result is not None:
                        data = result
                        break
            for t in pending:
                t.cancel()

            if data is not None:
                await cache_set(overpass_cache_key, data, ttl=7200)  # 2 hours

        if data is None:
            return self._demo_barriers(coords), 70

        counts = {"steps": 0, "kerb": 0, "crossing": 0, "elevator": 0, "ramp": 0, "cobblestone": 0}
        barriers_list = []

        for el in data.get("elements", []):
            tags = el.get("tags", {})
            e_lat = el.get("lat") or (el.get("center") or {}).get("lat")
            e_lng = el.get("lon") or (el.get("center") or {}).get("lon")
            if not e_lat or not e_lng:
                continue

            near = any(
                ((c[1] - e_lat) ** 2 + (c[0] - e_lng) ** 2) < 0.00018 ** 2 * 2
                for c in coords
            )
            if not near:
                continue

            barrier_type = None
            if tags.get("highway") == "steps":
                barrier_type = "steps"
            elif tags.get("barrier") == "kerb":
                barrier_type = "kerb"
            elif tags.get("highway") == "crossing":
                barrier_type = "crossing"
            elif tags.get("amenity") == "elevator":
                barrier_type = "elevator"
            elif tags.get("ramp") == "yes":
                barrier_type = "ramp"
            elif tags.get("surface") in ("cobblestone", "sett"):
                barrier_type = "cobblestone"

            if barrier_type:
                counts[barrier_type] += 1
                barriers_list.append({"type": barrier_type, "lat": e_lat, "lng": e_lng})

        # Если Overpass ответил но вернул 0 барьеров — показываем демо
        if not barriers_list:
            return self._demo_barriers(coords), 70

        score = 90
        score -= min(30, counts["steps"] * 8)
        score -= min(15, counts["kerb"] * 3)
        score -= min(10, counts["cobblestone"] * 5)
        score += min(10, counts["ramp"] * 3)
        score += min(5, counts["elevator"] * 5)
        score = max(5, min(100, score))

        return barriers_list, score

    def _demo_barriers(self, coords: list) -> list:
        """Генерирует демо-барьеры вдоль маршрута (используется когда Overpass недоступен)."""
        types = ["steps", "kerb", "crossing", "cobblestone", "kerb", "steps"]
        barriers = []
        step = max(1, len(coords) // 6)
        for i, t in enumerate(types):
            idx = min(step * (i + 1), len(coords) - 1)
            c = coords[idx]
            barriers.append({"type": t, "lat": c[1], "lng": c[0]})
        return barriers

    async def get_history(self, user_id: uuid.UUID, limit: int, offset: int) -> list:
        result = await self.db.execute(
            select(Route)
            .where(Route.user_id == user_id)
            .order_by(Route.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()

    async def get_by_id(self, route_id: str, user_id: uuid.UUID):
        result = await self.db.execute(
            select(Route).where(Route.id == uuid.UUID(route_id), Route.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def rate(self, route_id: str, body: RateRouteRequest, user_id: uuid.UUID):
        rating = RouteRating(
            route_id=uuid.UUID(route_id),
            user_id=user_id,
            stars=body.stars,
            comment=body.comment,
        )
        self.db.add(rating)
        await self.db.flush()
        return {"status": "ok", "stars": body.stars}
