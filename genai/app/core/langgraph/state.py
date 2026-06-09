from typing import TypedDict


class WorkflowState(TypedDict, total=False):
    """Shared state threaded through the LangGraph nodes.

    Channels use replace semantics (no reducers): each node reads the current
    `outputs` list and returns the full updated list, mirroring the sequential
    accumulation in the TypeScript StepExecutor.
    """

    provider: str
    image_url: str
    plan: list[dict]  # [{ "prompt": <langfuse prompt name>, "model": "image"|"reasoning" }]
    retrieved: str
    outputs: list[str]
    extracted_text: str
    final_text: str
