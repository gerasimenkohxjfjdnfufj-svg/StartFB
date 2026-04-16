from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.mark import MarkCreate, MarkResponse, MarkVoteRequest
from app.services.mark_service import MarkService
from app.services.auth_service import AuthService
from typing import Optional

router = APIRouter()


@router.get("/", response_model=list[MarkResponse])
async def list_marks(
    south: float = Query(...),
    west: float  = Query(...),
    north: float = Query(...),
    east: float  = Query(...),
    category: Optional[str] = None,
    source: str = "all",
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """Список отметок в bbox. Не требует авторизации."""
    service = MarkService(db)
    return await service.list_in_bbox(south, west, north, east, category, source, limit)


@router.post("/", response_model=MarkResponse, status_code=201)
async def create_mark(
    body: MarkCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(AuthService.get_current_user),
):
    """Добавить новую отметку."""
    service = MarkService(db)
    return await service.create(body, current_user.id)


@router.get("/{mark_id}", response_model=MarkResponse)
async def get_mark(mark_id: str, db: AsyncSession = Depends(get_db)):
    """Получить отметку по ID."""
    service = MarkService(db)
    return await service.get_by_id(mark_id)


@router.post("/{mark_id}/vote")
async def vote_mark(
    mark_id: str,
    body: MarkVoteRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(AuthService.get_current_user),
):
    """Подтвердить или опровергнуть отметку."""
    service = MarkService(db)
    return await service.vote(mark_id, body.vote, current_user.id)
