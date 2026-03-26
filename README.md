<div align="center">
 
<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=220&section=header&text=Доступный%20город&fontSize=54&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Цифровой%20двойник%20доступной%20городской%20среды&descAlignY=58&descSize=19&descColor=b8e8ce" width="100%"/>
 
</div>
 
<div align="center">
 
[![CI](https://github.com/YOUR_ORG/dostupny-gorod/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_ORG/dostupny-gorod/actions)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL+PostGIS-16-336791?style=flat-square&logo=postgresql&logoColor=white)](#)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](#)
[![OpenStreetMap](https://img.shields.io/badge/OpenStreetMap-данные-7EBC6F?style=flat-square&logo=openstreetmap&logoColor=white)](https://openstreetmap.org)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](#)
 
<br/>
 
**Пилот: Москва 2026** &nbsp;·&nbsp; [Документация API](http://localhost:8000/docs) &nbsp;·&nbsp; [Архитектура](#-архитектура) &nbsp;·&nbsp; [Быстрый старт](#-быстрый-старт)
 
</div>
 
---
 
## ❗ Проблема
 
Существующие навигаторы — **2ГИС, Яндекс Карты, Google Maps** — строят маршруты только по скорости. Они не знают о:
 
- 🪜 лестницах и высоких бордюрах без съездов
- ♿ отсутствии пандусов или их нерабочем состоянии  
- 🛗 сломанных лифтах в подземных переходах
- 🚧 временных преградах: ремонт, перекрытия, открытые люки
 
Человек с коляской или на инвалидном кресле упирается в непреодолимый барьер, теряет время и силы — а иногда и вовсе отказывается от поездки. **До 15–20% жителей крупных городов** относятся к маломобильным группам населения. Это десятки миллионов людей.
 
---
 
## ✅ Наше решение
 
**Доступный город** — навигационная платформа с краудсорсинговой картой доступности и умным алгоритмом построения маршрутов, учитывающим реальные физические барьеры.
 
```
Обычный навигатор             Доступный город
─────────────────             ──────────────────────────────────────────
Кратчайший путь         →     Путь без барьеров
Данные дорог            →     Теги OSM: ступени, пандусы, лифты, бордюры
Один маршрут для всех   →     4 профиля: колясочник, слабовидящий, пожилой, после травмы
Нет обратной связи      →     Краудсорсинг: жители сами отмечают препятствия
Только навигация        →     B2G аналитика и тепловые карты для муниципалитетов
```
 
### Как это работает
 
```
 1. Пользователь             2. Система                    3. Результат
 ───────────────             ──────────────                ────────────
 Выбирает профиль      →     OSRM строит пешеходный   →   Маршрут на карте
 Вводит "Откуда/Куда"        маршрут (тротуары,            с цветом доступности
                             тропинки, переходы)           0–100%
 
                             Overpass API проверяет   →   Маркеры барьеров:
                             барьеры из OSM в bbox         🪜 ступени
                             (обновляются каждые           ♿ пандусы
                             1–3 дня)                      🚦 переходы
                                                           🛗 лифты
 
 4. После поездки
 ───────────────
 Добавляет отметку     →     Сохраняется в БД         →   Данные улучшаются
 о новом препятствии         Другие подтверждают           для всех пользователей
```
 
---
 
## ✨ Возможности
 
| | Функция | Описание |
|-|---------|----------|
| ♿ | **4 профиля доступности** | Колясочник, слабовидящий, пожилой, после травмы — влияют на маршрут и анализ |
| 🗺 | **Пешеходный роутинг** | OSRM foot — только тротуары, тропинки, пешеходные зоны |
| 🔍 | **Барьеры из OSM** | Ступени, бордюры, брусчатка, переходы, лифты — реальные данные |
| 📊 | **Оценка доступности** | 0–100% по числу реальных барьеров вдоль маршрута |
| 📍 | **Краудсорсинг** | 18 типов отметок, 3 категории, голосование за достоверность |
| 🎤 | **Голосовой ввод** | Web Speech API — для слабовидящих и пожилых |
| 🌙 | **Тёмная / светлая тема** | Переключение с сохранением предпочтений |
| 📱 | **Адаптивный интерфейс** | Полноценная работа на мобильных устройствах |
| 🏛 | **B2G аналитика** | Тепловые карты, отчёты, аудит доступности для муниципалитетов |
 
---
 
## 👥 Целевая аудитория
 
| Сегмент | Размер (Москва) | Роль в экосистеме | Профиль |
|---------|----------------|-------------------|---------|
| 👶 Родители с колясками | ~250 000 семей | Основные пользователи и волонтёры (источники данных) | `wheelchair` |
| ♿ Люди с инвалидностью | ~180 000 чел. | Ядро пользовательской ценности — для них доступность критична | `wheelchair` |
| 🦯 Пожилые люди (60+) | ~2 900 000 чел. | Массовый сегмент с трудностями при ходьбе | `elderly` |
| 🩹 После травм / временные | ~120 000 чел. | Временные ограничения — высокая мотивация | `stroller` |
| 👁 Слабовидящие | ~85 000 чел. | Нуждаются в тактильных ориентирах и звуковых светофорах | `visually` |
| 🏛 Муниципалитеты | B2G | Платёжеспособные заказчики аналитики и аудита | API-ключ |
| 🤝 НКО и активисты | — | Партнёры, драйверы краудсорсинга и продвижения | — |
| **Итого МГН** | **~15–20% населения** | | |
 
---
 
## 🚀 Быстрый старт
 
### Требования
 
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose  
- [Git](https://git-scm.com/)
 
### Запуск за 4 команды
 
```bash
# 1. Клонировать репозиторий
git clone https://github.com/YOUR_ORG/dostupny-gorod.git
cd dostupny-gorod
 
# 2. Настроить окружение
cp .env.example .env
# Отредактируй .env — смени SECRET_KEY, POSTGRES_PASSWORD, JWT_SECRET
 
# 3. Поднять все сервисы
docker compose up --build
 
# 4. Открыть в браузере
# Frontend  → http://localhost:3000
# API Docs  → http://localhost:8000/docs
# Health    → http://localhost:8000/health
```
 
### Что поднимается
 
```
docker compose up
├── nginx          :80      Reverse proxy + раздача статики
├── frontend       :3000    React SPA + Leaflet карта
├── backend        :8000    FastAPI REST API
├── db             :5432    PostgreSQL 16 + PostGIS 3.4
├── redis          :6379    Кеш маршрутов + Celery broker
├── celery_worker           Фоновые задачи
└── celery_beat             Синхронизация OSM каждые 6 часов
```
 
---
 
## 🏗 Архитектура
 
```
┌─────────────────────────────────────────────────────────────┐
│                       Пользователь                          │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Nginx  (reverse proxy)                     │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
             ▼                            ▼
┌────────────────────┐        ┌───────────────────────────────┐
│   React Frontend   │        │       FastAPI Backend         │
│   Leaflet.js       │        │       Python 3.12             │
│   TypeScript       │        │       SQLAlchemy 2.0 async    │
└────────────────────┘        └──────────────┬────────────────┘
                                             │
               ┌─────────────────┬───────────┴──────────────┐
               ▼                 ▼                           ▼
    ┌─────────────────┐  ┌─────────────┐         ┌─────────────────────┐
    │  PostgreSQL 16  │  │   Redis 7   │         │   Celery Worker     │
    │  + PostGIS 3.4  │  │   Cache     │         │   OSM Sync (6ч)     │
    └─────────────────┘  └─────────────┘         └──────────┬──────────┘
                                                             │
                  ┌──────────────────┬──────────────────────┘
                  ▼                  ▼                  ▼
       ┌─────────────────┐  ┌────────────────┐  ┌──────────────┐
       │  OSRM foot      │  │  Overpass API  │  │  Nominatim   │
       │  Пешеходный     │  │  Барьеры OSM   │  │  Геокодинг   │
       │  роутинг        │  │  в реальном    │  │  адресов     │
       └─────────────────┘  │  времени       │  └──────────────┘
                            └────────────────┘
```
 
### Технологический стек
 
| Слой | Технология | Версия |
|------|-----------|--------|
| **Frontend** | React + TypeScript + Vite | 18 / 5 |
| **Карта** | Leaflet.js + Leaflet Routing Machine | 1.9 |
| **Backend** | FastAPI + Uvicorn | 0.115 |
| **ORM** | SQLAlchemy async + GeoAlchemy2 | 2.0 |
| **База данных** | PostgreSQL + PostGIS | 16 / 3.4 |
| **Кеш / очередь** | Redis + Celery | 7 / 5.4 |
| **Геоданные** | OpenStreetMap / Overpass API / OSRM | — |
| **Авторизация** | JWT (python-jose) + bcrypt | — |
| **Деплой** | Docker Compose + Nginx | — |
| **Аналитика B2G** | DataLens / Tableau (интеграция) | — |
 
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
│   │   ├── schemas/            # Pydantic схемы запросов/ответов
│   │   ├── services/           # auth · route · mark · osm · geo
│   │   └── main.py
│   ├── alembic/                # миграции БД
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
│
├── 📂 frontend/
│   ├── src/
│   │   ├── components/         # map · ui · layout
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── store/              # Zustand
│   │   ├── services/           # API клиент
│   │   └── types/
│   └── Dockerfile
│
├── 📂 infrastructure/
│   ├── nginx/nginx.conf
│   └── scripts/init_db.sql     # PostGIS extensions
│
├── 📂 .github/
│   ├── workflows/ci.yml        # GitHub Actions
│   └── ISSUE_TEMPLATE/         # шаблоны задач
│
├── docker-compose.yml
├── .env.example
└── README.md
```
 
---
 
## 🌿 Git-стратегия
 
```
main            ←  продакшн  (только через PR + обязательный review)
  └─ develop    ←  основная ветка разработки
       ├─ feature/auth-jwt          # Роман: новые фичи
       ├─ feature/react-map-layer   #
       ├─ fix/overpass-timeout      # Роман: исправления
       └─ design/onboarding-screens # Никита: макеты и ассеты
```
 
**Правила:**
- В `main` и `develop` — только через **Pull Request**
- Формат коммитов: `feat:` `fix:` `docs:` `design:` `chore:`
- Каждый PR ссылается на Issue
 
---
 
## 🗺 Дорожная карта
 
```
  2025 Q4            2026 Q1–Q2           2026 Q3–Q4           2027+
     │                   │                    │                   │
     ▼                   ▼                    ▼                   ▼
  ✅ MVP             🔄 Этап 1            📌 Этап 2           🔜 Этап 3
  ─────────          ─────────────        ─────────────        ───────────
  HTML прототип      Backend prod         React фронтенд       10+ городов
  Карта + маршруты   FastAPI + PostGIS    PWA мобильная        B2G контракты
  OSM барьеры        Auth + REST API      Пилот в ЦАО          Масштаб
  Краудсорсинг       Docker + CI/CD       B2G дашборд          Партнёрства
```
 
- [x] HTML MVP — карта, маршруты, 4 профиля, отметки, тёмная тема
- [x] Техдокументация — ТЗ, архитектура, схема БД, описание API
- [x] Backend структура — FastAPI, модели, сервисы, Docker Compose
- [x] GitHub: репозиторий, ветки, CI, шаблоны Issues
- [ ] **Backend реализация** — авторизация, маршруты, отметки *(в работе)*
- [ ] **Frontend React** — карта, компоненты, интеграция с API
- [ ] **Пилот** — тестирование в ЦАО Москвы с реальными пользователями
- [ ] **B2G версия** — тепловые карты, дашборд, экспорт отчётов
- [ ] **Масштабирование** — 10+ городов России
 
---
 
## 🔌 API
 
Базовый URL: `https://api.dostupny-gorod.ru/v1`  
Документация: [Swagger UI](http://localhost:8000/docs) · [ReDoc](http://localhost:8000/redoc)
 
```http
# Построить доступный маршрут
POST /v1/routes/build
Content-Type: application/json
{
  "from":    { "lat": 55.7558, "lng": 37.6176 },
  "to":      { "lat": 55.7600, "lng": 37.6250 },
  "profile": "wheelchair"
}
 
# Барьеры OSM в bbox
GET /v1/osm/barriers?south=55.75&west=37.61&north=55.76&east=37.63
 
# Отметки пользователей в bbox
GET /v1/marks?south=55.75&west=37.61&north=55.76&east=37.63&category=obstacle
 
# Поиск адреса
GET /v1/geo/search?q=Красная+площадь+Москва
```
 
---
 
## 💰 Бизнес-модель
 
```
B2C                            B2G                         B2B
────────────────               ────────────────────        ─────────────────────
Бесплатное приложение          Подписка на аналитику       Аудит доступности
Краудсорсинг данных            1–3 млн ₽/год               объектов
Рост DAU                       Тепловые карты              300–700 тыс ₽/объект
Сообщество                     Отчёты «Доступная среда»    ТЦ · банки · застройщики
                               Программы Smart City        Сертификация
```
 
**Рыночные драйверы:**
- 🏛 Программа «Доступная среда» — муниципалитеты ищут инструменты аудита
- 📱 Зрелость технологий — смартфоны с GPS и привычка к краудсорсингу
- 🤝 Инклюзивная культура — горожане готовы участвовать в улучшении среды
- 🚫 Свободная ниша — крупные игроки не решают задачу доступности
 
---
 
## 👥 Команда
 
<table>
  <tr>
    <td align="center" width="220">
      <b>🎨 Дизайнер</b><br/>
      <b>Ветчинин Никита</b><br/>
      <sub>UI/UX, макеты, дизайн-система</sub>
    </td>
    <td align="center" width="220">
      <b>📣 Тимлид / Маркетинг</b><br/>
      <b>Герасименко Александр</b><br/>
      <a href="https://github.com/Markelo7713">@Markelo7713</a><br/>
      <sub>Стратегия, B2G, roadmap, продвижение</sub>
    </td>
    <td align="center" width="220">
      <b>📊 Бизнес-аналитик</b><br/>
      <b>Пестов Ярослав</b><br/>
      <a href="https://github.com/YouRop03">@YouRop03</a><br/>
      <sub>ТЗ, user stories, acceptance criteria</sub>
    </td>
    <td align="center" width="220">
      <b>👨‍💻 Разработчик</b><br/>
      <b>Прокофьев Роман</b><br/>
      <a href="https://github.com/Bug6763">@Bug6763</a><br/>
      <sub>Backend, Frontend, DevOps, CI/CD</sub>
    </td>
  </tr>
</table>
 
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
# → открыть Pull Request в develop
```
</details>
 
<details>
<summary><b>🎨 Никита — дизайн</b></summary>
 
```bash
git checkout -b design/название-макета
# Добавь файлы в docs/design/
git commit -m "design: макеты экрана маршрута"
git push origin design/название-макета
```
</details>
 
<details>
<summary><b>📊 Ярослав (@YouRop03) — аналитика</b></summary>
 
Создавай **GitHub Issues** по шаблону `✨ Фича` — там уже есть поля для Acceptance Criteria, ролей и зависимостей между задачами.
</details>
 
<details>
<summary><b>📣 Александр (@Markelo7713) — тимлид</b></summary>
 
Управляй **Milestones**: `Этап 1 — Backend`, `Этап 2 — Frontend`, `Этап 3 — Пилот Москва`. Назначай Issues на milestone и отслеживай прогресс через Projects.
</details>
 
---
 
## 📜 Лицензия
 
[MIT](LICENSE) — свободное использование с указанием авторства.
 
---
 
<div align="center">
 
**Делаем город удобным для каждого** 🏙
 
*Команда «Доступный город» · Москва, 2025–2026*  
*Кафедра индустриального программирования*
 
<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=120&section=footer" width="100%"/>
 
</div>