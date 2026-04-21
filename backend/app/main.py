import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from sqlalchemy import select

from app.core.config import settings
from app.api.v1.router import api_router
from app.db.session import engine
from app.db.base import Base
from app.db.models_all import *  # noqa — загружаем все модели для metadata


async def create_admin():
    """Создаёт аккаунт администратора если его нет."""
    from app.db.session import AsyncSessionLocal
    from app.models.user import User, UserRole
    from app.services.auth_service import AuthService

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == settings.ADMIN_EMAIL))
        if result.scalar_one_or_none():
            return
        admin = User(
            email=settings.ADMIN_EMAIL,
            password_hash=AuthService.hash_password(settings.ADMIN_PASSWORD),
            name=settings.ADMIN_NAME,
            role=UserRole.admin,
            profile_type=None,
        )
        db.add(admin)
        await db.commit()
        print(f"✅ Админ создан: {settings.ADMIN_EMAIL} / {settings.ADMIN_PASSWORD}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Создаём таблицы и аккаунт админа при старте
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await create_admin()
    yield
    await engine.dispose()


app = FastAPI(
    title="Доступный город API",
    description="Цифровой двойник доступной городской среды — API платформы",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Роутер API v1
app.include_router(api_router, prefix="/v1")

# Статические файлы (загруженные фото)
UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok", "version": "1.0.0", "app": settings.APP_NAME}
