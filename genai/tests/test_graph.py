import pytest

from app.core.config import Settings
from app.core.langgraph.graph import build_graph
from app.core.langgraph.nodes import parse_steps
from tests.fakes import FakeLlm, FakePrompts, FakeRag


def _state():
    return {
        "provider": "openai",
        "image_url": "https://example.com/uploads/upl_abc123-deadbeef.jpg",
        "outputs": [],
    }


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
    llm = FakeLlm()
    graph = build_graph(llm=llm, prompts=FakePrompts(), rag=FakeRag(), settings=Settings(RAG_ENABLED=True))
    result = graph.invoke(_state(), config={})
    assert result["extracted_text"] == "EXTRACTED"
    assert result["final_text"] == "NORMALIZED"
    assert [s["model"] for s in result["plan"]] == ["image", "reasoning"]


def test_retrieved_context_is_injected_into_reasoning_prompt():
    llm = FakeLlm()
    rag = FakeRag(context="TEMPLATE_CONTEXT")
    graph = build_graph(llm=llm, prompts=FakePrompts(), rag=rag, settings=Settings(RAG_ENABLED=True))
    graph.invoke(_state(), config={})
    # RAG is queried with the extracted text; its result lands in the reasoning system prompt.
    assert rag.queries == ["EXTRACTED"]
    assert "TEMPLATE_CONTEXT" in llm.reasoning_model.last_system
    assert llm.reasoning_model.last_user == "EXTRACTED"


def test_rag_disabled_skips_retrieval():
    llm = FakeLlm()
    rag = FakeRag()
    graph = build_graph(llm=llm, prompts=FakePrompts(), rag=rag, settings=Settings(RAG_ENABLED=False))
    result = graph.invoke(_state(), config={})
    assert rag.queries == []
    assert "TEMPLATE_CONTEXT" not in (llm.reasoning_model.last_system or "")
    assert result["final_text"] == "NORMALIZED"
