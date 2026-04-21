import json
import hashlib
import logging
from typing import Any, Optional
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)

_redis: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
    return _redis


async def cache_get(key: str) -> Any | None:
    try:
        r = await get_redis()
        val = await r.get(key)
        if val is not None:
            return json.loads(val)
    except Exception as e:
        logger.warning("Cache GET error: %s", e)
    return None


async def cache_set(key: str, value: Any, ttl: int = 3600) -> None:
    try:
        r = await get_redis()
        await r.set(key, json.dumps(value), ex=ttl)
    except Exception as e:
        logger.warning("Cache SET error: %s", e)


def make_key(*parts: Any) -> str:
    raw = ":".join(str(p) for p in parts)
    if len(raw) > 200:
        raw = hashlib.md5(raw.encode()).hexdigest()
    return raw
