from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.core.config import get_settings
from app.core.observability.langsmith_integration import create_feedback
from app.core.security import require_api_key

router = APIRouter()


class LangSmithFeedbackRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    trace_id: str = Field(alias="traceId")
    key: str = "user_feedback"
    score: float | int | bool | None = None
    comment: str | None = None
    metadata: dict[str, Any] | None = None


class LangSmithFeedbackResponse(BaseModel):
    ok: bool


@router.post(
    "/v1/langsmith/feedback",
    response_model=LangSmithFeedbackResponse,
    dependencies=[Depends(require_api_key)],
)
def record_langsmith_feedback(payload: LangSmithFeedbackRequest) -> LangSmithFeedbackResponse:
    try:
        create_feedback(
            get_settings(),
            trace_id=payload.trace_id,
            key=payload.key,
            score=payload.score,
            comment=payload.comment,
            metadata=payload.metadata,
        )
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    return LangSmithFeedbackResponse(ok=True)
