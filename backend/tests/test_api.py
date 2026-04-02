"""
Базовые тесты для CI/CD.
Запуск: cd backend && pytest tests/ -v
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_health(client):
    """GET /health должен возвращать 200 OK."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_register(client):
    """POST /v1/auth/register должен возвращать токены."""
    resp = await client.post("/v1/auth/register", json={
        "email": "test@example.com",
        "password": "testpassword123",
        "name": "Тест Пользователь",
        "profile_type": "wheelchair",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    """POST /v1/auth/login с неверным паролем → 401."""
    resp = await client.post("/v1/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_marks_no_auth(client):
    """GET /v1/marks без авторизации должен работать (публичный эндпоинт)."""
    resp = await client.get("/v1/marks", params={
        "south": 55.74, "west": 37.60,
        "north": 55.76, "east": 37.62,
    })
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_geo_search(client):
    """GET /v1/geo/search должен возвращать результаты для Москвы."""
    resp = await client.get("/v1/geo/search", params={"q": "Красная площадь Москва"})
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
