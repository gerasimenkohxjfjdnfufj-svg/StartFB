from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Регистрация нового пользователя."""
    service = AuthService(db)
    return await service.register(body)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Вход. Возвращает access + refresh токены."""
    service = AuthService(db)
    return await service.login(body)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(refresh_token: str, db: AsyncSession = Depends(get_db)):
    """Обновление access токена по refresh токену."""
    service = AuthService(db)
    return await service.refresh(refresh_token)


@router.get("/me", response_model=UserResponse)
async def me(db: AsyncSession = Depends(get_db), current_user=Depends(AuthService.get_current_user)):
    """Профиль текущего пользователя."""
    return current_user
