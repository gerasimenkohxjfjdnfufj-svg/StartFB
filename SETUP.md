# 🚀 Пошаговое развёртывание — Доступный город

## ЧТО НУЖНО УСТАНОВИТЬ (один раз)

| Инструмент | Для чего | Скачать |
|-----------|----------|---------|
| Git | Клонирование репозитория | git-scm.com |
| Docker Desktop | Запуск всего проекта | docker.com/get-docker |

> Windows: Docker Desktop → включить WSL2 integration
> Mac: Docker Desktop → Settings → Resources → Memory: ≥ 4GB
> Linux: sudo apt install docker.io docker-compose-plugin

---

## ШАГ 1 — Клонировать репозиторий

```bash
git clone https://github.com/YOUR_ORG/dostupny-gorod.git
cd dostupny-gorod
```

Если репозиторий ещё не на GitHub — просто распакуйте ZIP в папку.

---

## ШАГ 2 — Создать файл .env

```bash
# Скопировать шаблон
cp .env.example .env
```

Открыть `.env` в любом редакторе и заменить значения:

```env
POSTGRES_PASSWORD=придумайте_пароль
SECRET_KEY=любая_длинная_случайная_строка_32_символа
JWT_SECRET=ещё_одна_случайная_строка
```

> Остальные значения можно оставить как есть для локальной разработки.

---

## ШАГ 3 — Запустить проект

```bash
docker compose up --build
```

Первый запуск займёт **5–10 минут** (скачиваются образы, собирается код).
Последующие запуски: **30–60 секунд**.

### Что происходит при запуске:
```
[1/7] nginx        — поднимается reverse proxy
[2/7] frontend     — собирается React приложение
[3/7] backend      — запускается FastAPI
[4/7] db           — запускается PostgreSQL + PostGIS
[5/7] redis        — запускается Redis
[6/7] celery_worker — запускаются фоновые задачи
[7/7] celery_beat  — запускается планировщик OSM sync
```

---

## ШАГ 4 — Применить миграции БД

После того как контейнеры запустились (видите "Application startup complete"):

```bash
# В новом терминале
docker compose exec backend alembic upgrade head
```

Вы должны увидеть: `INFO [alembic.runtime.migration] Running upgrade ...`

---

## ШАГ 5 — Открыть приложение

| URL | Что открывается |
|-----|----------------|
| http://localhost | Приложение (карта + навигация) |
| http://localhost/docs | Swagger UI — все API эндпоинты |
| http://localhost/redoc | ReDoc документация |

---

## ШАГ 6 — Проверить что всё работает

```bash
# Проверить статус контейнеров
docker compose ps

# Должно показать 7 строк со статусом "running" или "Up"
```

```bash
# Проверить health API
curl http://localhost/health
# Ответ: {"status":"ok","version":"1.0.0"}
```

---

## ПОВСЕДНЕВНЫЕ КОМАНДЫ

```bash
# Запустить (фоново)
docker compose up -d

# Остановить
docker compose down

# Посмотреть логи
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f celery_worker

# Перезапустить один сервис
docker compose restart backend

# Зайти в контейнер
docker compose exec backend bash
docker compose exec db psql -U dguser -d dostupny_gorod
```

---

## РАЗРАБОТКА (hot-reload)

Для разработки с автоперезагрузкой фронтенда:

```bash
# В одном терминале — бэкенд + БД
docker compose up db redis backend celery_worker celery_beat

# В другом терминале — фронтенд с hot-reload
cd frontend
npm install --legacy-peer-deps
npm run dev
# Открыть http://localhost:5173
```

---

## ТИПИЧНЫЕ ПРОБЛЕМЫ

### "port 80 is already in use"
```bash
# Найти кто занял порт 80
sudo lsof -i :80  # Linux/Mac
netstat -ano | findstr :80  # Windows

# Остановить или изменить порт в docker-compose.yml
# ports: - "8080:80"  ← вместо "80:80"
```

### "PostGIS extension not found"
```bash
docker compose exec db psql -U dguser -d dostupny_gorod -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### "alembic: command not found"
```bash
docker compose exec backend pip install alembic
docker compose exec backend alembic upgrade head
```

### Docker не запускается на Windows
1. Открыть PowerShell как администратор
2. `wsl --install`
3. Перезагрузить компьютер
4. Открыть Docker Desktop

---

## СТРУКТУРА ПРОЕКТА

```
dostupny-gorod/
├── backend/               FastAPI + Python
│   ├── app/
│   │   ├── api/v1/        REST эндпоинты (auth, routes, marks, geo, osm)
│   │   ├── core/          Конфиг, Celery
│   │   ├── db/            SQLAlchemy сессия
│   │   ├── models/        PostgreSQL модели (User, Route, Mark...)
│   │   ├── schemas/       Pydantic схемы
│   │   ├── services/      Бизнес-логика
│   │   └── tasks/         Celery задачи (OSM sync)
│   ├── alembic/           Миграции БД
│   ├── tests/             Автотесты
│   └── Dockerfile
├── frontend/              React + TypeScript
│   ├── src/
│   │   ├── components/    UI компоненты (MapView, Sidebar)
│   │   ├── services/      API клиент
│   │   └── store/         Zustand состояние
│   └── Dockerfile
├── infrastructure/
│   ├── nginx/             Reverse proxy конфиг
│   └── scripts/           SQL инициализация
├── docs/                  Документация, дизайн, пилот
├── docker-compose.yml     Запуск всего
├── .env.example           Шаблон переменных
└── README.md
```

---

## КТО ЧТО ДЕЛАЕТ

| Сервис | Порт внутри | Кто разрабатывает |
|--------|------------|-------------------|
| nginx | 80 | Роман (конфиг) |
| frontend | 80 (внутри) | Роман |
| backend | 8000 (внутри) | Роман |
| db (PostgreSQL) | 5432 (внутри) | Роман (схема) |
| redis | 6379 (внутри) | Автоматически |
| celery_worker | — | Роман |
| celery_beat | — | Роман |

