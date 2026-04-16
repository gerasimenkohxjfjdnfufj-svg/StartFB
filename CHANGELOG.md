# Changelog

## [Unreleased] — В разработке

### Добавлено
- Структура проекта: backend (FastAPI) + frontend (React) + Docker Compose
- Модели БД: User, Route, Mark, OsmBarrier + PostGIS геополя
- API эндпоинты: auth, routes, marks, osm, geo
- Сервисы: OSRM routing, Overpass API, Nominatim geocoding
- Celery + Redis: фоновая синхронизация OSM каждые 6 часов
- GitHub Actions CI
- HTML MVP (прототип в браузере)

## [0.1.0] — 2025

### Первоначальный коммит
- Инициализация репозитория
- Базовая структура проекта
