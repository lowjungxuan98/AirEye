from uuid import UUID, uuid4

from app.core.config import Settings
from app.core.langgraph.graph import build_graph
from app.core.observability.langsmith_integration import langsmith_tracing_context
from app.core.observability.langfuse_tracing import make_callback_handler
from app.core.prompts.service import build_prompt_service
from app.core.util import extract_upload_id
from app.schemas.workflow import WorkflowRunRequest, WorkflowRunResponse, WorkflowStep
from app.services.image_input import (
    prepare_vision_image_url,
    redacted_vision_image_ref,
    vision_image_context,
)
from app.services.llm import LlmService
from app.services.rag import RagService


class WorkflowRunner:
    """Owns the compiled graph and its dependencies; invoked once per request."""

    def __init__(self, settings: Settings):
        self._settings = settings
        self._rag = RagService(settings) if settings.RAG_ENABLED else None
        self._graph = build_graph(
            llm=LlmService(settings),
            prompts=build_prompt_service(settings),
            rag=self._rag,
            settings=settings,
        )

    def run(self, request: WorkflowRunRequest) -> WorkflowRunResponse:
        session_id = extract_upload_id(request.image_url) or "unparsed-image-url"
        tags = ["aireye", request.kind, request.provider]
        metadata = {
            "langfuse_session_id": session_id,
            "langfuse_tags": tags,
            "session_id": session_id,
            "kind": request.kind,
            "provider": request.provider,
            "prompt_provider": self._settings.prompt_provider,
            "image_input_redacted": True,
        }
        trace_id = (
            str(uuid4())
            if self._settings.langsmith_configured and self._settings.LANGSMITH_TRACING_ENABLED
            else None
        )
        config: dict = {
            "run_name": f"aireye-{request.kind}-workflow",
            "metadata": metadata,
            "tags": tags,
        }
        if trace_id is not None:
            config["run_id"] = UUID(trace_id)
        handler = make_callback_handler(self._settings)
        if handler is not None:
            config["callbacks"] = [handler]

        model_image_url = prepare_vision_image_url(request.image_url, self._settings)
        graph_image_ref = redacted_vision_image_ref(session_id)

        with vision_image_context(model_image_url), langsmith_tracing_context(self._settings):
            result = self._graph.invoke(
                {"provider": request.provider, "image_url": graph_image_ref, "outputs": []},
                config=config,
            )

        plan = result.get("plan") or None
        return WorkflowRunResponse(
            extracted_text=result.get("extracted_text", ""),
            final_text=result.get("final_text", ""),
            steps=[WorkflowStep(**step) for step in plan] if plan else None,
            trace_id=trace_id,
        )
