from contextlib import nullcontext

from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.core.observability import langsmith_integration
from app.core.prompts import service as prompt_service_module
from app.core.prompts.service import build_prompt_service
from app.main import app
from app.schemas.workflow import WorkflowRunRequest, WorkflowRunResponse
import app.services.workflow as workflow_module
from app.services.langsmith_eval import (
    build_langsmith_target,
    extracted_text_present,
    final_text_matches_reference,
    final_text_present,
)
from app.services.workflow import WorkflowRunner


class _StubGraph:
    def __init__(self):
        self.state = None
        self.config = None

    def invoke(self, state, config=None):
        self.state = state
        self.config = config
        return {
            "extracted_text": "E",
            "final_text": "F",
            "plan": [{"prompt": "p", "model": "image"}],
        }


def test_langsmith_settings_default_disabled():
    settings = Settings()
    assert settings.LANGSMITH_ENABLED is False
    assert settings.langsmith_configured is False
    assert settings.prompt_provider == "langfuse"


def test_workflow_runner_returns_trace_id_when_langsmith_tracing_enabled(monkeypatch):
    monkeypatch.setattr(workflow_module, "langsmith_tracing_context", lambda settings: nullcontext())

    graph = _StubGraph()
    runner = WorkflowRunner(
        Settings(
            LANGFUSE_TRACING_ENABLED=False,
            LANGSMITH_ENABLED=True,
            LANGSMITH_API_KEY="lsv2_test",
            VISION_IMAGE_INLINE_ENABLED=False,
        )
    )
    runner._graph = graph

    response = runner.run(WorkflowRunRequest(provider="openai", imageUrl="https://x/upl_a.jpg"))

    assert response.trace_id
    assert str(graph.config["run_id"]) == response.trace_id
    assert graph.config["run_name"] == "aireye-import-workflow"
    assert graph.config["tags"] == ["aireye", "import", "openai"]
    assert graph.config["metadata"]["session_id"] == "upl_a"
    assert "imageUrl" not in graph.config["metadata"]
    assert graph.state["image_url"] == "redacted://aireye-image/upl_a"


def test_langsmith_prompt_provider_pulls_prompt(monkeypatch):
    monkeypatch.setattr(
        prompt_service_module,
        "pull_prompt_text",
        lambda settings, name, tag=None: f"{name}:{tag or settings.LANGSMITH_PROMPT_TAG}",
    )

    prompts = build_prompt_service(
        Settings(
            PROMPT_PROVIDER="langsmith",
            LANGSMITH_ENABLED=True,
            LANGSMITH_API_KEY="lsv2_test",
            LANGSMITH_PROMPT_TAG="staging",
        )
    )

    assert prompts.get_text("tool-reasoning") == "tool-reasoning:staging"


class _FeedbackClient:
    def __init__(self):
        self.calls = []

    def create_feedback(self, **kwargs):
        self.calls.append(kwargs)


def test_langsmith_feedback_endpoint_requires_api_key():
    with TestClient(app) as client:
        response = client.post(
            "/v1/langsmith/feedback",
            json={"traceId": "trace", "score": 1},
        )
    assert response.status_code == 401


def test_langsmith_feedback_endpoint_records_feedback(monkeypatch):
    feedback_client = _FeedbackClient()
    monkeypatch.setattr(langsmith_integration, "get_langsmith_client", lambda settings: feedback_client)

    get_settings.cache_clear()
    monkeypatch.setenv("LANGSMITH_ENABLED", "true")
    monkeypatch.setenv("LANGSMITH_API_KEY", "lsv2_test")
    monkeypatch.setenv("GENAI_API_KEY", "test-key")
    try:
        with TestClient(app) as client:
            app.state.workflow_runner = object()
            response = client.post(
                "/v1/langsmith/feedback",
                headers={"x-api-key": "test-key"},
                json={"traceId": "trace", "key": "user_feedback", "score": 1, "comment": "good"},
            )
    finally:
        get_settings.cache_clear()

    assert response.status_code == 200
    assert feedback_client.calls == [
        {
            "key": "user_feedback",
            "trace_id": "trace",
            "score": 1,
            "comment": "good",
        }
    ]


class _EvalRunner:
    def run(self, request: WorkflowRunRequest) -> WorkflowRunResponse:
        return WorkflowRunResponse(extracted_text="E", final_text=f"F:{request.provider}")


def test_langsmith_eval_target_and_evaluators():
    target = build_langsmith_target(_EvalRunner())
    output = target({"provider": "openai", "imageUrl": "https://x/upl_a.jpg"})

    assert output["extractedText"] == "E"
    assert output["finalText"] == "F:openai"
    assert extracted_text_present(output)
    assert final_text_present(output)
    assert final_text_matches_reference(output, {"finalText": "F:openai"}) is True
    assert final_text_matches_reference(output, {"finalText": "wrong"}) is False
    assert final_text_matches_reference(output, {}) is None
