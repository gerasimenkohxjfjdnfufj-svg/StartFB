from fastapi import APIRouter, Query
from app.services.geo_service import GeoService

router = APIRouter()
geo_service = GeoService()


@router.get("/search")
async def search(
    q: str = Query(..., min_length=2),
    city: str = Query(None),
    lat: float = Query(None),
    lng: float = Query(None),
    delta: float = Query(None),
):
    """Поиск адреса через Nominatim. city — ограничить поиск городом. lat/lng — центр для viewbox. delta — радиус в градусах."""
    return await geo_service.search(q, city, lat, lng, delta)


@router.get("/reverse")
async def reverse(lat: float, lng: float):
    """Адрес по координатам."""
    return await geo_service.reverse(lat, lng)


@router.get("/autocomplete")
async def autocomplete(q: str = Query(..., min_length=2)):
    """Автодополнение адресов."""
    return await geo_service.autocomplete(q)
