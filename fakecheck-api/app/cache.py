"""
In-memory caching layer for predictions (1h TTL).
"""
import os
import json
import hashlib
from typing import Optional
from datetime import datetime, timedelta


# In-memory cache as fallback
_memory_cache = {}


def get_redis_client():
    """Redis is optional - using in-memory cache."""
    return None


def cache_key(url: Optional[str], text: Optional[str], country: str, state: Optional[str]) -> str:
    """Generate cache key from request params."""
    payload = f"{url or ''}|{text or ''}|{country}|{state or ''}"
    return f"fakecheck:{hashlib.md5(payload.encode()).hexdigest()}"


def get_cached_prediction(key: str) -> Optional[dict]:
    """Retrieve cached prediction from memory."""
    if key in _memory_cache:
        cached_data, expiry = _memory_cache[key]
        if datetime.now() < expiry:
            return cached_data
        else:
            del _memory_cache[key]
    return None


def set_cached_prediction(key: str, value: dict, ttl: int = 3600):
    """Cache prediction in memory with TTL (default 1h)."""
    expiry = datetime.now() + timedelta(seconds=ttl)
    _memory_cache[key] = (value, expiry)
