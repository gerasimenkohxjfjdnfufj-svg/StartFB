from datetime import datetime, timedelta
from typing import Optional
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/auth/login")


class AuthService:

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Пароли ───────────────────────────────────────────────
    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)

    # ── Токены ───────────────────────────────────────────────
    @staticmethod
    def create_token(data: dict, expires_delta: timedelta) -> str:
        payload = data.copy()
        payload["exp"] = datetime.utcnow() + expires_delta
        return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    @staticmethod
    def create_access_token(user_id: str) -> str:
        return AuthService.create_token(
            {"sub": user_id, "type": "access"},
            timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )

    @staticmethod
    def create_refresh_token(user_id: str) -> str:
        return AuthService.create_token(
            {"sub": user_id, "type": "refresh"},
            timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )

    # ── Регистрация ──────────────────────────────────────────
    async def register(self, body: RegisterRequest) -> TokenResponse:
        # Проверяем уникальность email
        result = await self.db.execute(select(User).where(User.email == body.email))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

        user = User(
            email=body.email,
            password_hash=self.hash_password(body.password),
            name=body.name,
            profile_type=body.profile_type,
        )
        self.db.add(user)
        await self.db.flush()

        return TokenResponse(
            access_token=self.create_access_token(str(user.id)),
            refresh_token=self.create_refresh_token(str(user.id)),
        )

    # ── Вход ─────────────────────────────────────────────────
    async def login(self, body: LoginRequest) -> TokenResponse:
        result = await self.db.execute(select(User).where(User.email == body.email))
        user = result.scalar_one_or_none()

        if not user or not self.verify_password(body.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Неверный email или пароль")

        if not user.is_active:
            raise HTTPException(status_code=403, detail="Аккаунт заблокирован")

        user.last_login = datetime.utcnow()

        return TokenResponse(
            access_token=self.create_access_token(str(user.id)),
            refresh_token=self.create_refresh_token(str(user.id)),
        )

    # ── Обновление токена ────────────────────────────────────
    async def refresh(self, refresh_token: str) -> TokenResponse:
        try:
            payload = jwt.decode(refresh_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            if payload.get("type") != "refresh":
                raise HTTPException(status_code=401, detail="Неверный тип токена")
            user_id = payload["sub"]
        except JWTError:
            raise HTTPException(status_code=401, detail="Токен недействителен")

        return TokenResponse(
            access_token=self.create_access_token(user_id),
            refresh_token=self.create_refresh_token(user_id),
        )

    # ── Текущий пользователь (Dependency) ────────────────────
    @staticmethod
    async def get_current_user(
        token: str = Depends(oauth2_scheme),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            user_id: str = payload.get("sub")
            if not user_id or payload.get("type") != "access":
                raise HTTPException(status_code=401, detail="Невалидный токен")
        except JWTError:
            raise HTTPException(status_code=401, detail="Токен недействителен или истёк")

        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="Пользователь не найден")
        return user
