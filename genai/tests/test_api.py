from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import app
from app.schemas.workflow import WorkflowRunRequest, WorkflowRunResponse
from app.services.workflow import WorkflowRunner


class _StubGraph:
    def invoke(self, state, config=None):
        return {
            "extracted_text": "E",
            "final_text": "F",
            "plan": [{"prompt": "p", "model": "image"}],
        }


def test_workflow_runner_maps_graph_result_to_response():
    runner = WorkflowRunner(Settings(LANGFUSE_TRACING_ENABLED=False, VISION_IMAGE_INLINE_ENABLED=False))
    runner._graph = _StubGraph()
    response = runner.run(WorkflowRunRequest(provider="openai", imageUrl="https://x/upl_a.jpg"))
    assert isinstance(response, WorkflowRunResponse)
    dumped = response.model_dump(by_alias=True)
    assert dumped["extractedText"] == "E"
    assert dumped["finalText"] == "F"
    assert dumped["traceId"] is None


class _StubRunner:
    def run(self, request: WorkflowRunRequest) -> WorkflowRunResponse:
        return WorkflowRunResponse(extracted_text="E", final_text="F")


def test_workflow_endpoint_requires_api_key():
    with TestClient(app) as client:
        app.state.workflow_runner = _StubRunner()
        response = client.post(
            "/v1/workflow/run",
            json={"provider": "openai", "imageUrl": "https://x/upl_a.jpg"},
        )
    assert response.status_code == 401


def test_workflow_endpoint_returns_camel_case():
    with TestClient(app) as client:
        app.state.workflow_runner = _StubRunner()
        response = client.post(
            "/v1/workflow/run",
            headers={"x-api-key": get_settings().GENAI_API_KEY},
            json={"provider": "openai", "imageUrl": "https://x/upl_a.jpg"},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["extractedText"] == "E"
    assert body["finalText"] == "F"
