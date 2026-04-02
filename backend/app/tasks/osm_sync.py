import httpx
import logging
from app.core.celery_app import celery_app
from app.core.config import settings

logger = logging.getLogger(__name__)

# Bbox Москвы для синхронизации
MOSCOW_BBOX = {"south": 55.55, "west": 37.30, "north": 55.90, "east": 37.90}


@celery_app.task(name="app.tasks.osm_sync.sync_osm_barriers", bind=True, max_retries=3)
def sync_osm_barriers(self):
    """
    Синхронизирует данные о барьерах из Overpass API (OSM) в локальную БД.
    Запускается каждые 6 часов через Celery Beat.
    """
    import asyncio
    return asyncio.run(_sync())


async def _sync():
    bbox = MOSCOW_BBOX
    query = f"""
[out:json][timeout:30];
(
  node["highway"="steps"]({bbox['south']},{bbox['west']},{bbox['north']},{bbox['east']});
  way["highway"="steps"]({bbox['south']},{bbox['west']},{bbox['north']},{bbox['east']});
  node["barrier"="kerb"]["kerb"!="lowered"]["kerb"!="flush"]({bbox['south']},{bbox['west']},{bbox['north']},{bbox['east']});
  node["highway"="crossing"]({bbox['south']},{bbox['west']},{bbox['north']},{bbox['east']});
  node["amenity"="elevator"]({bbox['south']},{bbox['west']},{bbox['north']},{bbox['east']});
  way["ramp"="yes"]({bbox['south']},{bbox['west']},{bbox['north']},{bbox['east']});
  way["surface"="cobblestone"]({bbox['south']},{bbox['west']},{bbox['north']},{bbox['east']});
);
out center;
"""

    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            resp = await client.post(
                settings.OVERPASS_URL,
                data={"data": query},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            data = resp.json()

        elements = data.get("elements", [])
        logger.info(f"OSM sync: получено {len(elements)} элементов из Overpass API")

        # TODO: Сохранение в БД через SQLAlchemy (реализовать в Спринте 2)
        # Пока логируем результат
        type_counts = {}
        for el in elements:
            tags = el.get("tags", {})
            btype = (
                tags.get("highway") or
                tags.get("barrier") or
                tags.get("amenity") or
                tags.get("surface") or
                "other"
            )
            type_counts[btype] = type_counts.get(btype, 0) + 1

        logger.info(f"OSM sync completed: {type_counts}")
        return {"status": "ok", "total": len(elements), "types": type_counts}

    except Exception as e:
        logger.error(f"OSM sync failed: {e}")
        raise
