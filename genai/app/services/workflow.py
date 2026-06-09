from app.core.config import Settings
from app.core.langgraph.graph import build_graph
from app.core.observability.langfuse_tracing import make_callback_handler
from app.core.prompts.langfuse_prompts import PromptService
from app.core.util import extract_upload_id
from app.schemas.workflow import WorkflowRunRequest, WorkflowRunResponse, WorkflowStep
from app.services.llm import LlmService
from app.services.rag import RagService


class WorkflowRunner:
    """Owns the compiled graph and its dependencies; invoked once per request."""

    def __init__(self, settings: Settings):
        self._settings = settings
        self._rag = RagService(settings) if settings.RAG_ENABLED else None
        self._graph = build_graph(
            llm=LlmService(settings),
            prompts=PromptService(settings),
            rag=self._rag,
            settings=settings,
        )

    def run(self, request: WorkflowRunRequest) -> WorkflowRunResponse:
        session_id = extract_upload_id(request.image_url) or request.image_url
        config: dict = {
            "metadata": {
                "langfuse_session_id": session_id,
                "langfuse_tags": ["aireye", request.kind, request.provider],
            }
        }
        handler = make_callback_handler(self._settings)
        if handler is not None:
            config["callbacks"] = [handler]

        result = self._graph.invoke(
            {"provider": request.provider, "image_url": request.image_url, "outputs": []},
            config=config,
        )

        plan = result.get("plan") or None
        return WorkflowRunResponse(
            extracted_text=result.get("extracted_text", ""),
            final_text=result.get("final_text", ""),
            steps=[WorkflowStep(**step) for step in plan] if plan else None,
        )
