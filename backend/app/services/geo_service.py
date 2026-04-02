import httpx
from app.core.config import settings


class GeoService:
    """Геокодирование через Nominatim (OpenStreetMap)."""

    HEADERS = {"Accept-Language": "ru", "User-Agent": "DostupnyGorod/1.0"}
    TIMEOUT = 8.0

    async def search(self, q: str) -> list:
        async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
            resp = await client.get(
                f"{settings.NOMINATIM_URL}/search",
                params={"q": q, "format": "json", "limit": 5, "addressdetails": 1},
                headers=self.HEADERS,
            )
            resp.raise_for_status()
            data = resp.json()
        return [
            {
                "lat": float(r["lat"]),
                "lng": float(r["lon"]),
                "display_name": r["display_name"],
                "type": r.get("type"),
            }
            for r in data
        ]

    async def reverse(self, lat: float, lng: float) -> dict:
        async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
            resp = await client.get(
                f"{settings.NOMINATIM_URL}/reverse",
                params={"lat": lat, "lon": lng, "format": "json", "zoom": 16},
                headers=self.HEADERS,
            )
            resp.raise_for_status()
            data = resp.json()
        return {
            "lat": lat,
            "lng": lng,
            "display_name": data.get("display_name", ""),
            "address": data.get("address", {}),
        }

    async def autocomplete(self, q: str) -> list:
        """Автодополнение — тот же поиск, но быстрее с countrycodes."""
        async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
            resp = await client.get(
                f"{settings.NOMINATIM_URL}/search",
                params={"q": q, "format": "json", "limit": 7, "countrycodes": "ru"},
                headers=self.HEADERS,
            )
            resp.raise_for_status()
            data = resp.json()
        return [
            {"lat": float(r["lat"]), "lng": float(r["lon"]), "label": r["display_name"]}
            for r in data
        ]
