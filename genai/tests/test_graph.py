import pytest
from langchain_core.callbacks import BaseCallbackHandler

from app.core.config import Settings
from app.core.langgraph.graph import build_graph
from app.core.langgraph.nodes import parse_steps
from app.services.image_input import redacted_vision_image_ref, vision_image_context
from tests.fakes import FakeLlm, FakePrompts, FakeRag

MODEL_IMAGE_URL = "data:image/jpeg;base64,REAL_IMAGE"
SESSION_ID = "upl_abc123"


class RecordingCallback(BaseCallbackHandler):
    def __init__(self):
        self.chain_inputs = []

    def on_chain_start(self, serialized, inputs, **kwargs):
        self.chain_inputs.append(inputs)


def _state():
    return {
        "provider": "openai",
        "image_url": redacted_vision_image_ref(SESSION_ID),
        "outputs": [],
    }


def _invoke_graph(graph, config=None):
    with vision_image_context(MODEL_IMAGE_URL):
        return graph.invoke(_state(), config=config or {})


# --- parse_steps parity with the TypeScript parseSteps -----------------------

def test_parse_steps_valid():
    steps = parse_steps('{"steps":[{"prompt":"a","model":"image"}]}')
    assert steps == [{"prompt": "a", "model": "image"}]


def test_parse_steps_strips_code_fences():
    steps = parse_steps('```json\n{"steps":[{"prompt":"a","model":"reasoning"}]}\n```')
    assert steps == [{"prompt": "a", "model": "reasoning"}]


@pytest.mark.parametrize(
    "raw",
    [
        "not json",
        "[]",
        '{"steps":[]}',
        '{"steps":[{"prompt":"","model":"image"}]}',
        '{"steps":[{"prompt":"a","model":"audio"}]}',
    ],
)
def test_parse_steps_rejects_invalid(raw):
    with pytest.raises(ValueError):
        parse_steps(raw)


# --- end-to-end graph (mocked LLM / prompts / RAG) ---------------------------

def test_graph_produces_extracted_and_final_text():
    settings = Settings(RAG_ENABLED=True)
    llm = FakeLlm(settings)
    graph = build_graph(llm=llm, prompts=FakePrompts(), rag=FakeRag(), settings=settings)
    result = _invoke_graph(graph)
    assert result["extracted_text"] == "EXTRACTED"
    assert result["final_text"] == "NORMALIZED"
    assert [s["model"] for s in result["plan"]] == ["image", "reasoning"]
    assert result["image_url"] == redacted_vision_image_ref(SESSION_ID)
    assert llm.vision_model.image_urls == [MODEL_IMAGE_URL, MODEL_IMAGE_URL]


def test_retrieved_context_is_injected_into_reasoning_prompt():
    settings = Settings(RAG_ENABLED=True)
    llm = FakeLlm(settings)
    rag = FakeRag(context="TEMPLATE_CONTEXT")
    graph = build_graph(llm=llm, prompts=FakePrompts(), rag=rag, settings=settings)
    _invoke_graph(graph)
    # RAG is queried with the extracted text; its result lands in the reasoning system prompt.
    assert rag.queries == ["EXTRACTED"]
    assert "TEMPLATE_CONTEXT" in llm.reasoning_model.last_system
    assert llm.reasoning_model.last_user == "EXTRACTED"


def test_rag_disabled_skips_retrieval():
    settings = Settings(RAG_ENABLED=False)
    llm = FakeLlm(settings)
    rag = FakeRag()
    graph = build_graph(llm=llm, prompts=FakePrompts(), rag=rag, settings=settings)
    result = _invoke_graph(graph)
    assert rag.queries == []
    assert "TEMPLATE_CONTEXT" not in (llm.reasoning_model.last_system or "")
    assert result["final_text"] == "NORMALIZED"


def test_vision_callbacks_are_removed_by_default():
    settings = Settings(RAG_ENABLED=False, VISION_TRACE_IMAGE_INPUTS=False)
    llm = FakeLlm(settings)
    graph = build_graph(llm=llm, prompts=FakePrompts(), rag=FakeRag(), settings=settings)
    callback = RecordingCallback()

    _invoke_graph(graph, config={"callbacks": [callback], "metadata": {"safe": "yes"}})

    assert llm.vision_model.configs == [{"callbacks": []}, {"callbacks": []}]
    assert llm.vision_model.image_urls == [MODEL_IMAGE_URL, MODEL_IMAGE_URL]
    assert MODEL_IMAGE_URL not in repr(callback.chain_inputs)
