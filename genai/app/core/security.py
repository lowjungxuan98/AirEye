from fastapi import Depends, Header, HTTPException, status

from app.core.config import Settings, get_settings

API_KEY_HEADER = "x-api-key"


def require_api_key(
    x_api_key: str | None = Header(default=None, alias=API_KEY_HEADER),
    settings: Settings = Depends(get_settings),
) -> None:
    """Reject requests whose `x-api-key` header does not match `GENAI_API_KEY`."""
    if x_api_key != settings.GENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid API key",
        )
