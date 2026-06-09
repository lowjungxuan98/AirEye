from pydantic import BaseModel, ConfigDict, Field


class WorkflowStep(BaseModel):
    prompt: str
    model: str  # "image" | "reasoning"


class WorkflowRunRequest(BaseModel):
    """Input from the backend worker. Accepts camelCase (`imageUrl`) or snake_case."""

    model_config = ConfigDict(populate_by_name=True)

    provider: str
    image_url: str = Field(alias="imageUrl")
    kind: str = "import"


class WorkflowRunResponse(BaseModel):
    """Mirrors the `{ extractedText, finalText }` shape the backend already persists."""

    model_config = ConfigDict(populate_by_name=True)

    extracted_text: str = Field(serialization_alias="extractedText")
    final_text: str = Field(serialization_alias="finalText")
    steps: list[WorkflowStep] | None = None
    trace_id: str | None = Field(default=None, serialization_alias="traceId")
