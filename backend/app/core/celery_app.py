from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "dostupny_gorod",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.osm_sync"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Europe/Moscow",
    enable_utc=True,
    beat_schedule={
        # Синхронизация OSM-данных каждые 6 часов
        "sync-osm-barriers": {
            "task": "app.tasks.osm_sync.sync_osm_barriers",
            "schedule": crontab(hour="*/6"),
        },
    },
)
