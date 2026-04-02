<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=220&section=header&text=Доступный%20город&fontSize=56&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Цифровой%20двойник%20доступной%20городской%20среды&descAlignY=58&descSize=20&descColor=b8e8ce" width="100%"/>

</div>

<div align="center">

[![CI](https://github.com/YOUR_ORG/dostupny-gorod/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_ORG/dostupny-gorod/actions)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL+PostGIS-16-336791?style=flat-square&logo=postgresql&logoColor=white)](#)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](#)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](#)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](#)

<br/>

> *Навигационный сервис, который строит маршруты с учётом физических барьеров городской среды.*
> *Помогаем маломобильным группам безопасно перемещаться по городу — и даём муниципалитетам данные для его улучшения.*

<br/>

[🚀 Быстрый старт](#-быстрый-старт) · [🏗 Архитектура](#-архитектура) · [🔌 API](#-api) · [🗺 Дорожная карта](#-дорожная-карта)

</div>

---

## ❗ Проблема

Существующие навигаторы (2ГИС, Яндекс Карты, Google Maps) строят маршруты **только по критерию скорости**, игнорируя физические барьеры:

<table>
<tr>
<td width="50%">

**Человек с коляской или в кресле сталкивается с:**
- 🪜 Лестницами и высокими бордюрами
- ♿ Отсутствием пандусов или их нерабочим состоянием
- 🛗 Неработающими лифтами в переходах
- 🚧 Временными преградами — ремонт, завалы
- 🧱 Брусчаткой и неровным покрытием

</td>
<td width="50%">

**Результат:**
- Человек упирается в непреодолимый барьер
- Теряет время и силы на поиск объезда
- Отказывается от поездки вовсе
- **15–20% жителей крупных городов** лишены удобной навигации

</td>
</tr>
</table>

---

## ✅ Наше решение

**Доступный город** — краудсорсинговая карта доступности, интегрированная с умным алгоритмом построения маршрутов.

```
Пользователь задаёт маршрут A → B
         │
         ▼
Система анализирует данные OSM (ступени, пандусы, лифты, бордюры)
+ отметки от живых пользователей
         │
         ▼
Строит гарантированно проходимый маршрут для выбранного профиля
         │
         ▼
Показывает барьеры на карте, оценку доступности 0–100%
и пошаговую навигацию
```

### 4 профиля доступности

| Профиль | Кому | Что учитывает |
|---------|------|--------------|
| ♿ Колясочник / родитель | Инвалиды, мамы с колясками | Избегает ступеней, уклонов >5%, брусчатки. Предпочитает пандусы, лифты |
| 👁 Слабовидящий | Нарушения зрения | Предпочитает тактильную плитку, звуковые светофоры, поручни |
| 🦯 Пожилой человек | 60+, медленный темп | Избегает крутых спусков, ищет скамейки и укрытия |
| 🩹 После травмы | Временные ограничения | Избегает неровностей, длинных переходов без отдыха |

---

## 👥 Целевая аудитория

| Сегмент | Описание | Роль в экосистеме | Размер (Москва) |
|---------|----------|-------------------|----------------|
| 👶 **Родители с колясками** (25–40 лет) | Массовый, активный, мотивированный сегмент. Ежедневно сталкиваются с проблемой. | Основные пользователи и волонтёры — источники данных | ~250 000 семей |
| ♿ **Люди с инвалидностью** | Нарушения опорно-двигательного аппарата. Для них доступность критична. | Ядро пользовательской ценности | ~180 000 чел. |
| 🦯 **Пожилые люди** | Трудности с мобильностью, низкая уверенность в незнакомых маршрутах | Пользователи и источники данных | ~2 900 000 чел. |
| 🏛 **Муниципалитеты** | Отвечают за программу «Доступная среда» и распределение бюджета | Платёжеспособные B2G заказчики | Пилот: ЦАО Москвы |
| 🤝 **НКО и активисты** | Помогают с валидацией данных и продвижением | Партнёры и драйверы сообщества | — |

---

## 🚀 Почему именно сейчас

- 🏛 **Государственный заказ** — продолжает действовать программа «Доступная среда», но нужны инструменты аудита её эффективности
- 📱 **Зрелость технологий** — повсеместное распространение смартфонов с GPS и привычка к краудсорсингу (как в картах с пробками)
- 🌍 **Общественный запрос** — растёт инклюзивная культура, люди готовы участвовать в краудсорсинге
- 🕳 **Открытая ниша** — крупные игроки не решают проблему доступности, оставляя рынок свободным

---

## 👥 Команда

<table>
  <tr>
    <td align="center" width="200">
      <b>🎨 Дизайнер</b><br/><br/>
      Ветчинин Никита<br/>
      <sub>UI/UX, макеты, ассеты</sub>
    </td>
    <td align="center" width="200">
      <b>📣 Тимлид / Маркетинг</b><br/><br/>
      Герасименко Александр<br/>
      <a href="https://github.com/Markelo7713">@Markelo7713</a><br/>
      <sub>Стратегия, B2G, roadmap</sub>
    </td>
    <td align="center" width="200">
      <b>📊 Бизнес-аналитик</b><br/><br/>
      Пестов Ярослав<br/>
      <a href="https://github.com/YouRop03">@YouRop03</a><br/>
      <sub>ТЗ, user stories, acceptance criteria</sub>
    </td>
    <td align="center" width="200">
      <b>👨‍💻 Разработчик</b><br/><br/>
      Прокофьев Роман<br/>
      <a href="https://github.com/Bug6763">@Bug6763</a><br/>
      <sub>Backend, Frontend, DevOps</sub>
    </td>
  </tr>
</table>

---

## ✨ Функциональность

| # | Функция | Статус |
|---|---------|--------|
| 1 | ♿ 4 профиля доступности с персональными настройками маршрута | ✅ MVP готов |
| 2 | 🗺 Пешеходный маршрут по тротуарам, тропинкам, пешеходным зонам | ✅ MVP готов |
| 3 | 🔍 Проверка реальных барьеров из OSM — ступени, бордюры, брусчатка | ✅ MVP готов |
| 4 | 📊 Оценка доступности маршрута 0–100% с предупреждениями | ✅ MVP готов |
| 5 | 📍 Краудсорсинг отметок — 18 типов, 3 категории, голосование | ✅ MVP готов |
| 6 | 🎤 Голосовой ввод адресов (Web Speech API) | ✅ MVP готов |
| 7 | 🌙 Тёмная / светлая тема с сохранением предпочтений | ✅ MVP готов |
| 8 | 📱 Адаптивный интерфейс для мобильных устройств | ✅ MVP готов |
| 9 | 🔐 Авторизация, профили, история маршрутов | 🔄 Backend |
| 10 | 🏛 B2G дашборд — тепловые карты, отчёты для муниципалитетов | 📌 Этап 2 |

---

## 🚀 Быстрый старт

### Требования

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [Git](https://git-scm.com/)

### Запуск

```bash
# Клонировать
git clone https://github.com/YOUR_ORG/dostupny-gorod.git
cd dostupny-gorod

# Настроить переменные окружения
cp .env.example .env
# ⚠️  Обязательно смени SECRET_KEY, POSTGRES_PASSWORD, JWT_SECRET в .env

# Поднять все сервисы
docker compose up --build
```

| Сервис | URL |
|--------|-----|
| 🌐 Frontend | http://localhost:3000 |
| ⚡ Backend API | http://localhost:8000 |
| 📖 Swagger Docs | http://localhost:8000/docs |
| ❤️ Health check | http://localhost:8000/health |

### Что поднимается

```
docker compose up
├── nginx           :80     Reverse proxy + static
├── frontend        :3000   React SPA
├── backend         :8000   FastAPI
├── db              :5432   PostgreSQL 16 + PostGIS 3.4
├── redis           :6379   Cache + Celery broker
├── celery_worker           Фоновые задачи
└── celery_beat             OSM-синхронизация каждые 6 ч
```

---

## 🏗 Архитектура

```
                        ┌─────────────┐
                        │ Пользователь│
                        └──────┬──────┘
                               │ HTTPS
                        ┌──────▼──────┐
                        │    Nginx    │  ← reverse proxy + static
                        └──┬──────┬───┘
                           │      │
               ┌───────────▼┐    ┌▼──────────────────┐
               │  React 18  │    │   FastAPI Backend  │
               │ + Leaflet  │    │   Python 3.12      │
               │ + TypeScript│   │   SQLAlchemy async │
               └────────────┘    └────────┬───────────┘
                                          │
                    ┌─────────────────────┼──────────────┐
                    ▼                     ▼              ▼
             ┌────────────┐        ┌───────────┐  ┌──────────────┐
             │ PostgreSQL │        │  Redis 7  │  │    Celery    │
             │ + PostGIS  │        │  Cache    │  │   Worker     │
             └────────────┘        └───────────┘  └──────┬───────┘
                                                          │
                              ┌───────────────────────────┼──────────┐
                              ▼                           ▼          ▼
                      ┌──────────────┐         ┌──────────────┐  ┌──────────┐
                      │  OSRM foot   │         │ Overpass API │  │Nominatim │
                      │  пешеходный  │         │ барьеры OSM  │  │геокодинг │
                      │  роутинг     │         │ (обновл. 6ч) │  │адресов   │
                      └──────────────┘         └──────────────┘  └──────────┘
```

### Стек

| Слой | Технология | Версия |
|------|-----------|--------|
| Frontend | React + TypeScript + Vite | 18 / 5 |
| Карта | Leaflet.js + Routing Machine | 1.9 |
| Backend | FastAPI + Uvicorn | 0.115 |
| ORM | SQLAlchemy async + GeoAlchemy2 | 2.0 |
| База данных | PostgreSQL + PostGIS | 16 / 3.4 |
| Кеш / очередь | Redis + Celery | 7 / 5.4 |
| Геоданные | OpenStreetMap / Overpass / OSRM | — |
| Auth | JWT (python-jose) + bcrypt | — |
| Деплой | Docker Compose + Nginx | — |
| CI/CD | GitHub Actions | — |

---

## 📁 Структура проекта

```
dostupny-gorod/
│
├── 📂 backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # auth · routes · marks · geo · osm
│   │   ├── core/               # config · security
│   │   ├── db/                 # session · base
│   │   ├── models/             # User · Route · Mark · OsmBarrier
│   │   ├── schemas/            # Pydantic валидация
│   │   ├── services/           # бизнес-логика
│   │   └── main.py
│   ├── alembic/                # миграции БД
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
│
├── 📂 frontend/
│   └── src/
│       ├── components/         # map · ui · layout
│       ├── pages/
│       ├── hooks/
│       ├── store/              # Zustand
│       ├── services/           # API клиент
│       └── types/
│
├── 📂 infrastructure/
│   ├── nginx/nginx.conf
│   └── scripts/init_db.sql    # PostGIS инициализация
│
├── 📂 .github/
│   ├── workflows/ci.yml        # GitHub Actions
│   └── ISSUE_TEMPLATE/        # шаблоны задач
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🔌 API

Документация: **[Swagger UI](http://localhost:8000/docs)** · **[ReDoc](http://localhost:8000/redoc)**

```http
### Построить доступный маршрут
POST /v1/routes/build
Content-Type: application/json

{
  "from_point": { "lat": 55.7558, "lng": 37.6176 },
  "to_point":   { "lat": 55.7600, "lng": 37.6250 },
  "profile": "wheelchair",
  "avoid_construction": true
}

### Ответ
{
  "route_id": "uuid",
  "distance_m": 1240,
  "duration_sec": 960,
  "accessibility_score": 78,
  "geometry": { "type": "LineString", "coordinates": [...] },
  "barriers": { "steps": 2, "kerb": 1, "crossing": 3 }
}

### Отметки пользователей в области карты
GET /v1/marks?south=55.75&west=37.61&north=55.76&east=37.63&category=obstacle

### Барьеры из OSM
GET /v1/osm/barriers?south=55.75&west=37.61&north=55.76&east=37.63

### Поиск адреса
GET /v1/geo/search?q=Красная+площадь+Москва
```

---

## 🗺 Дорожная карта

```
   ✅ Сделано              🔄 В работе             📌 Запланировано
──────────────────────────────────────────────────────────────────────
  HTML MVP                Backend (FastAPI)        Frontend React
  Карта + маршруты        Авторизация (JWT)        Пилот ЦАО Москвы
  OSM барьеры             REST API endpoints       B2G дашборд
  Краудсорсинг отметок    PostgreSQL + PostGIS      Тепловые карты
  Голосовой ввод          Docker + CI/CD           Экспорт отчётов
  Тёмная тема             Celery OSM-синхрон.      10+ городов России
  Тех. документация       Тесты
```

- [x] HTML MVP — полностью рабочий прототип в браузере
- [x] Техническая документация — ТЗ, архитектура, API, БД
- [x] Структура backend — модели, сервисы, Docker Compose
- [x] GitHub: CI/CD, ветки, шаблоны Issues, README
- [ ] **Backend** — реализация auth, routes, marks, osm *(🔄 в работе)*
- [ ] **Frontend React** — компоненты, карта, подключение к API
- [ ] **Пилот** — тестирование с реальными пользователями в ЦАО
- [ ] **B2G** — аналитическая панель для муниципалитетов
- [ ] **Масштаб** — выход в 10+ городов России

---

## 🗄 База данных

**PostgreSQL 16 + PostGIS 3.4** — геоданные хранятся как `GEOMETRY` с GIST-индексами.

```
users            — аккаунты, профиль доступности
routes           — маршруты с геометрией LineString
route_ratings    — оценки (1–5 звёзд + комментарий)
marks            — отметки пользователей и данные из OSM
mark_votes       — голосование за достоверность
osm_barriers     — кеш барьеров OSM (обновляется каждые 6 ч)
analytics_daily  — агрегированная аналитика по районам (B2G)
```

---

## 📊 Бизнес-модель

```
     B2C                      B2G                        B2B
─────────────────     ─────────────────────────    ──────────────────────
Бесплатное         →  Подписка на аналитику    →   Аудит доступности
приложение            для муниципалитетов           объектов
                      1–3 млн ₽/год
Краудсорсинг          Тепловые карты               ТЦ, банки, застройщики
данных                                              300–700 тыс ₽/объект
                      Отчёты для программы
Рост DAU              «Доступная среда»            Сертификация
                      Минтруда РФ
```

---

## 🌿 Git-стратегия

```
main          ←  продакшн · только через PR + review
  └─ develop  ←  основная ветка разработки
       ├─ feature/название   ← фичи (Роман @Bug6763)
       ├─ fix/название       ← баги
       └─ design/название    ← макеты (Никита)
```

| Префикс | Использование |
|---------|---------------|
| `feat:` | новая функциональность |
| `fix:` | исправление бага |
| `docs:` | документация |
| `design:` | дизайн-ассеты |
| `chore:` | инфраструктура, зависимости |

---

## 🤝 Участие в проекте

<details>
<summary><b>👨‍💻 Роман (@Bug6763) — разработка</b></summary>

```bash
git checkout develop && git pull
git checkout -b feature/название-фичи
# ... работа ...
git commit -m "feat: что сделано"
git push origin feature/название-фичи
# → Открыть Pull Request в develop
```
</details>

<details>
<summary><b>🎨 Никита — дизайн</b></summary>

```bash
git checkout -b design/название-макета
# Добавь файлы в docs/design/
git commit -m "design: макеты главного экрана"
git push origin design/название-макета
```
</details>

<details>
<summary><b>📊 Ярослав (@YouRop03) — аналитика</b></summary>

Создавай **GitHub Issues** по шаблону `✨ Фича` — там уже есть поля для Acceptance Criteria, ролей и зависимостей.
</details>

<details>
<summary><b>📣 Александр (@Markelo7713) — тимлид</b></summary>

Управляй **Milestones**: `Этап 1 — Backend`, `Этап 2 — Frontend`, `Этап 3 — Пилот Москва`.
</details>

---

## 📜 Лицензия

[MIT](LICENSE) — свободное использование с указанием авторства.

---

<div align="center">

**Сделано с ♥ командой «Доступный город»**

*Москва, 2025–2026 · Кафедра индустриального программирования*

*«Делаем город удобным для каждого»*

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=120&section=footer" width="100%"/>

</div>
