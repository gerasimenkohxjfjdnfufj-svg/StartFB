import httpx
from app.core.config import settings


class OsmService:
    """Сервис для работы с Overpass API (OSM данные в реальном времени)."""

    TIMEOUT = 10.0

    async def _query_overpass(self, query: str) -> dict:
        async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
            resp = await client.post(
                settings.OVERPASS_URL,
                data={"data": query},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            return resp.json()

    async def get_barriers(self, south: float, west: float, north: float, east: float) -> list:
        """Ступени, высокие бордюры, брусчатка в bbox."""
        bbox = f"{south},{west},{north},{east}"
        query = f"""
[out:json][timeout:10];
(
  node["highway"="steps"]({bbox});
  way["highway"="steps"]({bbox});
  node["barrier"="kerb"]["kerb"!="lowered"]["kerb"!="flush"]({bbox});
  way["surface"="cobblestone"]({bbox});
  way["surface"="sett"]({bbox});
);
out center;
"""
        data = await self._query_overpass(query)
        return self._parse_elements(data, "barrier")

    async def get_accessibility(self, lat: float, lng: float) -> dict:
        """Данные доступности объекта по координатам."""
        query = f"""
[out:json][timeout:8];
(
  way["building"](around:20,{lat},{lng});
  node["amenity"](around:30,{lat},{lng});
  node["entrance"](around:20,{lat},{lng});
);
out body;
"""
        data = await self._query_overpass(query)
        elements = data.get("elements", [])
        if not elements:
            return {"found": False}

        el = elements[0]
        tags = el.get("tags", {})
        return {
            "found": True,
            "name": tags.get("name") or tags.get("name:ru"),
            "wheelchair": tags.get("wheelchair"),
            "ramp": tags.get("ramp") or tags.get("ramp:wheelchair"),
            "tactile_paving": tags.get("tactile_paving"),
            "elevator": tags.get("elevator"),
            "entrance": tags.get("entrance"),
        }

    async def get_crossings(self, south: float, west: float, north: float, east: float) -> list:
        """Пешеходные переходы в bbox."""
        bbox = f"{south},{west},{north},{east}"
        query = f"""
[out:json][timeout:8];
node["highway"="crossing"]({bbox});
out;
"""
        data = await self._query_overpass(query)
        return self._parse_elements(data, "crossing")

    async def get_elevators(self, south: float, west: float, north: float, east: float) -> list:
        """Лифты в bbox."""
        bbox = f"{south},{west},{north},{east}"
        query = f"""
[out:json][timeout:8];
(
  node["amenity"="elevator"]({bbox});
  node["highway"="elevator"]({bbox});
);
out;
"""
        data = await self._query_overpass(query)
        return self._parse_elements(data, "elevator")

    def _parse_elements(self, data: dict, element_type: str) -> list:
        result = []
        for el in data.get("elements", []):
            lat = el.get("lat") or (el.get("center") or {}).get("lat")
            lng = el.get("lon") or (el.get("center") or {}).get("lon")
            if not lat or not lng:
                continue
            result.append({
                "osm_id": el.get("id"),
                "osm_type": el.get("type"),
                "type": element_type,
                "lat": lat,
                "lng": lng,
                "tags": el.get("tags", {}),
            })
        return result
