from fastapi import APIRouter
from app.api.v1.endpoints import auth, routes, marks, geo, osm

api_router = APIRouter()

api_router.include_router(auth.router,   prefix="/auth",   tags=["Авторизация"])
api_router.include_router(routes.router, prefix="/routes", tags=["Маршруты"])
api_router.include_router(marks.router,  prefix="/marks",  tags=["Отметки"])
api_router.include_router(geo.router,    prefix="/geo",    tags=["Геокодирование"])
api_router.include_router(osm.router,    prefix="/osm",    tags=["OSM данные"])
