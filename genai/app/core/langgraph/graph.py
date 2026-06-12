from functools import partial

from langgraph.graph import END, START, StateGraph

from app.core.langgraph.nodes import (
    finalize_node,
    normalize_node,
    plan_node,
    retrieve_node,
    vision_extract_node,
)
from app.core.langgraph.state import WorkflowState


def build_graph(*, llm, prompts, rag, settings):
    """Compile the document-extraction graph:

        plan → vision-extract → retrieve(RAG) → normalize → finalize

    Dependencies are bound into the node callables so the compiled graph is a
    reusable singleton; per-request data flows through the state only.
    """
    graph = StateGraph(WorkflowState)

    graph.add_node("plan", partial(plan_node, llm=llm, prompts=prompts, settings=settings))
    graph.add_node("vision_extract", partial(vision_extract_node, llm=llm, prompts=prompts, settings=settings))
    graph.add_node("retrieve", partial(retrieve_node, rag=rag, settings=settings))
    graph.add_node("normalize", partial(normalize_node, llm=llm, prompts=prompts, settings=settings))
    graph.add_node("finalize", finalize_node)

    graph.add_edge(START, "plan")
    graph.add_edge("plan", "vision_extract")
    graph.add_edge("vision_extract", "retrieve")
    graph.add_edge("retrieve", "normalize")
    graph.add_edge("normalize", "finalize")
    graph.add_edge("finalize", END)

    return graph.compile()
