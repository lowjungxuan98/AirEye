import base64
import io
import logging
from contextlib import contextmanager, nullcontext
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import httpx
from PIL import Image, ImageOps

from app.core.config import Settings

logger = logging.getLogger(__name__)

_DATA_URL_PREFIX = "data:"
_CURRENT_VISION_IMAGE_URL: ContextVar[str | None] = ContextVar(
    "aireye_current_vision_image_url",
    default=None,
)


@dataclass(frozen=True)
class VisionModelInput:
    image_url: str
    config: dict[str, Any]


def prepare_vision_image_url(image_url: str, settings: Settings) -> str:
    """Return the image reference to send to the vision model.

    Remote HTTP(S) URLs are downloaded and converted to a compact JPEG data URL.
    That avoids model-provider-side timeouts while fetching large presigned S3
    URLs. Non-HTTP URLs and data URLs are left unchanged.
    """
    if not settings.VISION_IMAGE_INLINE_ENABLED:
        return image_url
    if image_url.startswith(_DATA_URL_PREFIX):
        return image_url
    if urlparse(image_url).scheme not in {"http", "https"}:
        return image_url

    raw = _download_image(image_url, settings)
    data_url = _to_jpeg_data_url(raw, settings)
    logger.info("prepared vision image as inline JPEG data URL")
    return data_url


@contextmanager
def vision_image_context(image_url: str):
    token = _CURRENT_VISION_IMAGE_URL.set(image_url)
    try:
        yield
    finally:
        _CURRENT_VISION_IMAGE_URL.reset(token)


def current_vision_image_url() -> str:
    image_url = _CURRENT_VISION_IMAGE_URL.get()
    if not image_url:
        raise RuntimeError("vision image URL is not available in request context")
    return image_url


def current_vision_model_input(config: dict[str, Any] | None, settings: Settings) -> VisionModelInput:
    return VisionModelInput(
        image_url=current_vision_image_url(),
        config=vision_trace_config(config, settings),
    )


def vision_trace_config(config: dict[str, Any] | None, settings: Settings) -> dict[str, Any]:
    """Return per-call config for image model calls.

    Image inputs are confidential. By default, vision calls run with callbacks
    removed so Langfuse/LangSmith never receive presigned image URLs or inline
    image bytes. The root graph still has run metadata, tags, and redacted state.
    """
    if settings.VISION_TRACE_IMAGE_INPUTS:
        return config or {}
    return {"callbacks": []}


def vision_tracing_context(settings: Settings):
    """Disable LangSmith auto-tracing around direct image model calls by default."""
    if settings.VISION_TRACE_IMAGE_INPUTS:
        return nullcontext()
    try:
        import langsmith as ls

        return ls.tracing_context(enabled=False)
    except Exception:
        return nullcontext()


def redacted_vision_image_ref(session_id: str) -> str:
    return f"redacted://aireye-image/{session_id}"


def _download_image(image_url: str, settings: Settings) -> bytes:
    timeout = httpx.Timeout(settings.VISION_IMAGE_DOWNLOAD_TIMEOUT_SECONDS)
    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        response = client.get(image_url)
        response.raise_for_status()

    content_type = response.headers.get("content-type", "")
    if content_type and not content_type.lower().startswith("image/"):
        raise ValueError(f"imageUrl did not return image content: {content_type}")

    body = response.content
    max_bytes = settings.VISION_IMAGE_MAX_DOWNLOAD_BYTES
    if max_bytes > 0 and len(body) > max_bytes:
        raise ValueError(f"imageUrl download exceeded {max_bytes} bytes")
    return body


def _to_jpeg_data_url(raw: bytes, settings: Settings) -> str:
    image = Image.open(io.BytesIO(raw))
    image = ImageOps.exif_transpose(image)
    image.thumbnail(
        (settings.VISION_IMAGE_MAX_LONG_EDGE, settings.VISION_IMAGE_MAX_LONG_EDGE),
        Image.Resampling.LANCZOS,
    )

    if image.mode != "RGB":
        image = image.convert("RGB")

    output = io.BytesIO()
    image.save(
        output,
        format="JPEG",
        quality=settings.VISION_IMAGE_JPEG_QUALITY,
        optimize=True,
    )
    encoded = base64.b64encode(output.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"
