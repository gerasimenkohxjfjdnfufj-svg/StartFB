from fastapi import APIRouter, Query
from app.services.osm_service import OsmService

router = APIRouter()
osm_service = OsmService()


@router.get("/barriers")
async def barriers(
    south: float, west: float, north: float, east: float,
):
    """Барьеры OSM в bbox: ступени, бордюры, брусчатка."""
    return await osm_service.get_barriers(south, west, north, east)


@router.get("/accessibility")
async def accessibility(lat: float, lng: float):
    """Данные доступности объекта по координатам (здание, POI)."""
    return await osm_service.get_accessibility(lat, lng)


@router.get("/crossings")
async def crossings(south: float, west: float, north: float, east: float):
    """Пешеходные переходы в bbox."""
    return await osm_service.get_crossings(south, west, north, east)


@router.get("/elevators")
async def elevators(south: float, west: float, north: float, east: float):
    """Лифты в bbox."""
    return await osm_service.get_elevators(south, west, north, east)
