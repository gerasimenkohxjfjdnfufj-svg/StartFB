from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.v1.router import api_router
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Запуск и остановка приложения."""
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


@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok", "version": "1.0.0", "app": settings.APP_NAME}
