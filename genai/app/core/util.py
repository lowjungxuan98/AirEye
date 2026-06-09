import re
from urllib.parse import unquote, urlparse

_UPLOAD_ID_PATTERN = re.compile(r"^(upl_[A-Za-z0-9]+)(?:-|\.|$)")


def extract_upload_id(image_url: str) -> str | None:
    """Pull the `upl_...` id out of an image URL, mirroring the backend's
    `extractUploadIdFromImageUrl`. Returns None when no id is present so callers
    can fall back to the raw URL (e.g. for a Langfuse session id)."""
    pathname = image_url
    try:
        pathname = urlparse(image_url).path or image_url
    except ValueError:
        pass
    filename = unquote(pathname).rsplit("/", 1)[-1]
    match = _UPLOAD_ID_PATTERN.match(filename)
    return match.group(1) if match else None
