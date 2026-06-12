import asyncio
import time

import httpx
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.config import Settings, get_settings
from app.core.observability.langfuse_tracing import langfuse_ready
from app.core.observability.langsmith_integration import (
    check_langsmith_connection,
    langsmith_ready,
)

router = APIRouter()

_TIMEOUT_SECONDS = 5.0


def _ms(start: float) -> int:
    return int((time.monotonic() - start) * 1000)


async def _check_litellm(client: httpx.AsyncClient, settings: Settings) -> dict:
    start = time.monotonic()
    try:
        response = await client.get(
            f"{settings.LITELLM_BASE_URL.rstrip('/')}/models",
            headers={"authorization": f"Bearer {settings.LITELLM_API_KEY}"},
        )
        response.raise_for_status()
        return {"ok": True, "latencyMs": _ms(start)}
    except Exception as error:  # noqa: BLE001
        return {"ok": False, "latencyMs": _ms(start), "error": str(error)[:200]}


async def _check_qdrant(client: httpx.AsyncClient, settings: Settings) -> dict:
    start = time.monotonic()
    try:
        headers = {"api-key": settings.QDRANT_API_KEY} if settings.QDRANT_API_KEY else {}
        response = await client.get(f"{settings.QDRANT_URL.rstrip('/')}/readyz", headers=headers)
        response.raise_for_status()
        return {"ok": True, "latencyMs": _ms(start)}
    except Exception as error:  # noqa: BLE001
        return {"ok": False, "latencyMs": _ms(start), "error": str(error)[:200]}


async def _check_langfuse(settings: Settings) -> dict:
    start = time.monotonic()
    if not settings.langfuse_configured or not langfuse_ready():
        return {"ok": False, "latencyMs": _ms(start), "error": "not configured"}
    try:
        from langfuse import get_client

        await asyncio.to_thread(get_client().auth_check)
        return {"ok": True, "latencyMs": _ms(start)}
    except Exception as error:  # noqa: BLE001
        return {"ok": False, "latencyMs": _ms(start), "error": str(error)[:200]}


async def _check_langsmith(settings: Settings) -> dict:
    start = time.monotonic()
    if not settings.LANGSMITH_ENABLED:
        return {"ok": True, "enabled": False, "latencyMs": _ms(start)}
    if not settings.langsmith_configured or not langsmith_ready():
        return {"ok": False, "enabled": True, "latencyMs": _ms(start), "error": "not configured"}
    try:
        await asyncio.to_thread(check_langsmith_connection, settings)
        return {"ok": True, "enabled": True, "latencyMs": _ms(start)}
    except Exception as error:  # noqa: BLE001
        return {"ok": False, "enabled": True, "latencyMs": _ms(start), "error": str(error)[:200]}


@router.get("/health")
async def health() -> JSONResponse:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
        litellm, qdrant = await asyncio.gather(
            _check_litellm(client, settings),
            _check_qdrant(client, settings),
        )
    langfuse, langsmith = await asyncio.gather(
        _check_langfuse(settings),
        _check_langsmith(settings),
    )

    ok = (
        litellm["ok"]
        and langfuse["ok"]
        and langsmith["ok"]
        and (qdrant["ok"] or not settings.RAG_ENABLED)
    )
    body = {
        "ok": ok,
        "litellm": litellm,
        "qdrant": qdrant,
        "langfuse": langfuse,
        "langsmith": langsmith,
    }
    return JSONResponse(content=body, status_code=200 if ok else 503)
