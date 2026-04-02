from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.route import BuildRouteRequest, RouteResponse, RateRouteRequest
from app.services.route_service import RouteService
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/build", response_model=RouteResponse, status_code=201)
async def build_route(
    body: BuildRouteRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(AuthService.get_current_user),
):
    """
    Построить доступный маршрут A→B.
    Использует OSRM (foot) + проверку барьеров через Overpass API.
    """
    service = RouteService(db)
    return await service.build(body, current_user)


@router.get("/history")
async def history(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(AuthService.get_current_user),
    limit: int = 20,
    offset: int = 0,
):
    """История маршрутов пользователя."""
    service = RouteService(db)
    return await service.get_history(current_user.id, limit, offset)


@router.get("/{route_id}", response_model=RouteResponse)
async def get_route(
    route_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(AuthService.get_current_user),
):
    """Получить маршрут по ID."""
    service = RouteService(db)
    route = await service.get_by_id(route_id, current_user.id)
    if not route:
        raise HTTPException(status_code=404, detail="Маршрут не найден")
    return route


@router.post("/{route_id}/rate")
async def rate_route(
    route_id: str,
    body: RateRouteRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(AuthService.get_current_user),
):
    """Оценить маршрут (1–5 звёзд)."""
    service = RouteService(db)
    return await service.rate(route_id, body, current_user.id)
