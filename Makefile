.PHONY: up down build logs migrate test shell-backend

# Запустить всё
up:
	docker compose up --build

# Запустить в фоне
up-d:
	docker compose up --build -d

# Остановить
down:
	docker compose down

# Остановить и удалить volumes (ОСТОРОЖНО: сотрёт БД)
down-v:
	docker compose down -v

# Пересобрать без кеша
build:
	docker compose build --no-cache

# Логи
logs:
	docker compose logs -f

# Логи только backend
logs-backend:
	docker compose logs -f backend

# Создать миграцию (пример: make migrate msg="add users table")
migrate:
	docker compose exec backend alembic revision --autogenerate -m "$(msg)"

# Применить миграции
upgrade:
	docker compose exec backend alembic upgrade head

# Запустить тесты
test:
	docker compose exec backend pytest tests/ -v

# Войти в контейнер backend
shell-backend:
	docker compose exec backend bash

# Войти в PostgreSQL
shell-db:
	docker compose exec db psql -U dg_user -d dostupny_gorod

# Статус контейнеров
status:
	docker compose ps
