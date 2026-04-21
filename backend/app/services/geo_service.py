import httpx
import logging
from fastapi import HTTPException
from app.core.config import settings
from app.core.cache import cache_get, cache_set, make_key

logger = logging.getLogger(__name__)

PHOTON_URL = "https://photon.komoot.io/api"


class GeoService:
    """Геокодирование: Photon (primary) + Nominatim (fallback/reverse)."""

    HEADERS = {"Accept-Language": "ru", "User-Agent": "DostupnyGorod/1.0"}
    TIMEOUT = 8.0

    # ── Форматирование адреса из Photon ──────────────────────────────────────

    def _format_photon(self, feat: dict) -> str:
        p = feat.get("properties", {})
        city    = p.get("city") or p.get("town") or p.get("village") or p.get("county") or ""
        street  = p.get("street") or ""
        house   = p.get("housenumber") or ""
        name    = p.get("name") or ""

        # Если это POI/здание с именем — добавляем
        parts = []
        if city:
            parts.append(city)
        if street:
            parts.append(street)
        elif name and name != city:
            parts.append(name)
        if house:
            parts.append(house)

        if not parts:
            # Fallback: берём name + city
            return ", ".join(filter(None, [name, city])) or p.get("extent", [""])[0] or ""
        return ", ".join(parts)

    # ── Форматирование адреса из Nominatim ───────────────────────────────────

    def _format_address(self, r: dict) -> str:
        addr = r.get("address", {})
        city = (
            addr.get("city") or addr.get("town") or addr.get("village")
            or addr.get("municipality") or addr.get("county") or ""
        )
        road  = addr.get("road") or addr.get("pedestrian") or addr.get("footway") or ""
        house = addr.get("house_number", "")
        block = addr.get("block") or addr.get("building") or ""

        parts = []
        if city:  parts.append(city)
        if road:  parts.append(road)
        if house:
            h = house + (f", стр. {block}" if block else "")
            parts.append(h)

        if not parts or not road:
            raw = r.get("display_name", "")
            chunks = [c.strip() for c in raw.split(",")]
            filtered = [
                c for c in chunks
                if not c.isdigit() and "Россия" not in c
                and "федеральный округ" not in c
                and ("область" not in c.lower() or city in c)
            ]
            return ", ".join(filtered[:3]) if filtered else raw.split(",")[0]

        return ", ".join(parts)

    # ── Основной поиск (Photon) ───────────────────────────────────────────────

    async def search(
        self,
        q: str,
        city: str | None = None,
        lat: float | None = None,
        lng: float | None = None,
        delta: float | None = None,
    ) -> list:
        cache_key = make_key("geo_ph2", q.lower(), city or "", round(lat or 0, 2), round(lng or 0, 2))
        cached = await cache_get(cache_key)
        if cached is not None:
            return cached

        search_q = f"{q}, {city}" if city else q

        params: dict = {
            "q": search_q,
            "lang": "ru",
            "limit": 7,
        }

        # Ограничиваем поиск bounding box города
        if lat is not None and lng is not None:
            d = delta if delta is not None else 1.8
            # Photon bbox: lon_min,lat_min,lon_max,lat_max
            params["bbox"] = f"{lng - d},{lat - d},{lng + d},{lat + d}"

        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                resp = await client.get(PHOTON_URL, params=params, headers=self.HEADERS)
                resp.raise_for_status()
                feats = resp.json().get("features", [])
        except (httpx.ConnectError, httpx.TimeoutException):
            raise HTTPException(status_code=503, detail="Сервис геокодирования недоступен")
        except httpx.HTTPStatusError as e:
            logger.warning("Photon error %s, fallback to Nominatim", e.response.status_code)
            return await self._search_nominatim(search_q, lat, lng, delta)

        # Фильтруем только Россию
        ru_feats = [
            f for f in feats
            if f.get("properties", {}).get("country_code", "").lower() == "ru"
        ]
        # Если фильтр по России убрал всё — берём без фильтра
        if not ru_feats:
            ru_feats = feats

        result = [
            {
                "lat": feat["geometry"]["coordinates"][1],
                "lng": feat["geometry"]["coordinates"][0],
                "display_name": self._format_photon(feat),
                "type": feat.get("properties", {}).get("type"),
            }
            for feat in ru_feats[:5]
        ]
        await cache_set(cache_key, result, ttl=600)
        return result

    # ── Fallback: Nominatim ───────────────────────────────────────────────────

    async def _search_nominatim(
        self,
        search_q: str,
        lat: float | None = None,
        lng: float | None = None,
        delta: float | None = None,
    ) -> list:
        params: dict = {
            "q": search_q, "format": "json", "limit": 5,
            "addressdetails": 1, "countrycodes": "ru",
        }
        if lat is not None and lng is not None:
            d = delta if delta is not None else 1.8
            params["viewbox"] = f"{lng - d},{lat + d},{lng + d},{lat - d}"
            params["bounded"] = 1

        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                resp = await client.get(
                    f"{settings.NOMINATIM_URL}/search",
                    params=params, headers=self.HEADERS,
                )
                resp.raise_for_status()
                data = resp.json()
        except Exception:
            raise HTTPException(status_code=503, detail="Сервис геокодирования недоступен")

        return [
            {
                "lat": float(r["lat"]),
                "lng": float(r["lon"]),
                "display_name": self._format_address(r),
                "type": r.get("type"),
            }
            for r in data[:5]
        ]

    # ── Reverse geocoding (Nominatim) ─────────────────────────────────────────

    async def reverse(self, lat: float, lng: float) -> dict:
        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                resp = await client.get(
                    f"{settings.NOMINATIM_URL}/reverse",
                    params={"lat": lat, "lon": lng, "format": "json", "zoom": 16},
                    headers=self.HEADERS,
                )
                resp.raise_for_status()
                data = resp.json()
        except (httpx.ConnectError, httpx.TimeoutException):
            raise HTTPException(status_code=503, detail="Сервис геокодирования недоступен")
        except httpx.HTTPStatusError:
            raise HTTPException(status_code=502, detail="Ошибка сервиса геокодирования")
        return {
            "lat": lat, "lng": lng,
            "display_name": data.get("display_name", ""),
            "address": data.get("address", {}),
        }

    async def autocomplete(self, q: str) -> list:
        return await self.search(q)
