import uuid
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2.shape import from_shape
from shapely.geometry import LineString, Point
from app.core.config import settings
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

    async def build(self, body: BuildRouteRequest, user: User) -> RouteResponse:
        """Построить маршрут через OSRM + проверить барьеры через Overpass."""

        # 1. Запрос к OSRM
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

        if not osrm_data.get("routes"):
            raise Exception("OSRM не вернул маршрут")

        route_data = osrm_data["routes"][0]
        geometry_coords = route_data["geometry"]["coordinates"]  # [[lng, lat], ...]
        distance_m = int(route_data["distance"])

        # Скорость по профилю
        speed_kmh = PROFILE_SPEED.get(body.profile, 3.5)
        duration_sec = int((distance_m / 1000) / speed_kmh * 3600)

        # 2. Проверка барьеров через Overpass
        lats = [c[1] for c in geometry_coords]
        lngs = [c[0] for c in geometry_coords]
        south, north = min(lats), max(lats)
        west,  east  = min(lngs), max(lngs)

        barriers, score = await self._check_barriers(
            geometry_coords, south, west, north, east, body.profile
        )

        # 3. Сохранить маршрут в БД
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
            barriers_found=barriers,
        )
        self.db.add(route)
        await self.db.flush()

        return RouteResponse(
            route_id=str(route.id),
            distance_m=distance_m,
            duration_sec=duration_sec,
            accessibility_score=score,
            geometry={"type": "LineString", "coordinates": geometry_coords},
            barriers=barriers,
        )

    async def _check_barriers(
        self, coords: list, south, west, north, east, profile: str
    ) -> tuple[dict, int]:
        """Запросить барьеры из OSM и рассчитать оценку доступности."""
        bbox = f"{south},{west},{north},{east}"
        query = f"""
[out:json][timeout:10];
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
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    settings.OVERPASS_URL,
                    data={"data": query},
                )
                data = resp.json()
        except Exception:
            return {}, 75  # Если Overpass недоступен — возвращаем нейтральный балл

        counts = {"steps": 0, "kerb": 0, "crossing": 0, "elevator": 0, "ramp": 0, "cobblestone": 0}

        for el in data.get("elements", []):
            tags = el.get("tags", {})
            e_lat = el.get("lat") or (el.get("center") or {}).get("lat")
            e_lng = el.get("lon") or (el.get("center") or {}).get("lon")
            if not e_lat or not e_lng:
                continue

            # Близость к маршруту (~20 м)
            near = any(
                ((c[1] - e_lat) ** 2 + (c[0] - e_lng) ** 2) < 0.00018 ** 2 * 2
                for c in coords
            )
            if not near:
                continue

            if tags.get("highway") == "steps":
                counts["steps"] += 1
            if tags.get("barrier") == "kerb":
                counts["kerb"] += 1
            if tags.get("highway") == "crossing":
                counts["crossing"] += 1
            if tags.get("amenity") == "elevator":
                counts["elevator"] += 1
            if tags.get("ramp") == "yes":
                counts["ramp"] += 1
            if tags.get("surface") in ("cobblestone", "sett"):
                counts["cobblestone"] += 1

        # Подсчёт балла
        score = 90
        score -= min(30, counts["steps"] * 8)
        score -= min(15, counts["kerb"] * 3)
        score -= min(10, counts["cobblestone"] * 5)
        score += min(10, counts["ramp"] * 3)
        score += min(5, counts["elevator"] * 5)
        score = max(5, min(100, score))

        return counts, score

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
