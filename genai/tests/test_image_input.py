import base64
import io

from PIL import Image

from app.core.config import Settings
from app.services.image_input import (
    _to_jpeg_data_url,
    current_vision_model_input,
    prepare_vision_image_url,
    redacted_vision_image_ref,
    vision_image_context,
)


def test_prepare_vision_image_url_leaves_data_url_unchanged():
    value = "data:image/jpeg;base64,abc"
    assert prepare_vision_image_url(value, Settings()) == value


def test_prepare_vision_image_url_can_be_disabled():
    value = "https://example.com/image.jpg"
    assert prepare_vision_image_url(value, Settings(VISION_IMAGE_INLINE_ENABLED=False)) == value


def test_to_jpeg_data_url_resizes_and_encodes():
    source = io.BytesIO()
    Image.new("RGB", (3000, 1000), "white").save(source, format="PNG")

    data_url = _to_jpeg_data_url(
        source.getvalue(),
        Settings(VISION_IMAGE_MAX_LONG_EDGE=1200, VISION_IMAGE_JPEG_QUALITY=80),
    )

    assert data_url.startswith("data:image/jpeg;base64,")
    raw = base64.b64decode(data_url.split(",", 1)[1])
    image = Image.open(io.BytesIO(raw))
    assert image.format == "JPEG"
    assert max(image.size) == 1200


def test_current_vision_model_input_uses_context_and_removes_callbacks():
    with vision_image_context("data:image/jpeg;base64,REAL"):
        vision_input = current_vision_model_input(
            {"callbacks": [object()], "metadata": {"safe": True}},
            Settings(VISION_TRACE_IMAGE_INPUTS=False),
        )

    assert vision_input.image_url == "data:image/jpeg;base64,REAL"
    assert vision_input.config == {"callbacks": []}


def test_current_vision_model_input_can_preserve_trace_config_when_enabled():
    config = {"callbacks": [object()], "metadata": {"safe": True}}

    with vision_image_context("data:image/jpeg;base64,REAL"):
        vision_input = current_vision_model_input(config, Settings(VISION_TRACE_IMAGE_INPUTS=True))

    assert vision_input.config is config


def test_redacted_vision_image_ref_does_not_include_source_url_or_base64():
    ref = redacted_vision_image_ref("upl_abc")

    assert ref == "redacted://aireye-image/upl_abc"
    assert "http" not in ref
    assert "base64" not in ref
