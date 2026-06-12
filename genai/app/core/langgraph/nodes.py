import json
import re

from app.core.langgraph.state import WorkflowState
from app.services.llm import (
    LlmService,
    message_text,
    reasoning_messages,
)

STEP_MODEL_IMAGE = "image"
STEP_MODEL_REASONING = "reasoning"

_FENCE_PATTERN = re.compile(r"^```(?:json)?\s*\n?([\s\S]*?)\n?```$", re.IGNORECASE)


def _strip_fences(raw: str) -> str:
    trimmed = raw.strip()
    match = _FENCE_PATTERN.match(trimmed)
    return match.group(1).strip() if match else trimmed


def parse_steps(raw: str) -> list[dict]:
    """Parse the tool-reasoning plan JSON. Behaviour matches the backend's
    `parseSteps` (strip code fences, require a non-empty `steps` array, validate
    each step's `prompt` + `model`)."""
    candidate = _strip_fences(raw)
    try:
        parsed = json.loads(candidate)
    except json.JSONDecodeError as error:
        raise ValueError(f"tool-reasoning did not return JSON: {raw[:200]}") from error

    if not isinstance(parsed, dict):
        raise ValueError("tool-reasoning JSON must be an object")
    steps_value = parsed.get("steps")
    if not isinstance(steps_value, list) or not steps_value:
        raise ValueError("tool-reasoning JSON must contain a non-empty `steps` array")

    steps: list[dict] = []
    for index, entry in enumerate(steps_value):
        if not isinstance(entry, dict):
            raise ValueError(f"tool-reasoning step {index} is not an object")
        prompt = entry.get("prompt")
        model = entry.get("model")
        if not isinstance(prompt, str) or not prompt.strip():
            raise ValueError(f"tool-reasoning step {index} missing string `prompt`")
        if model not in (STEP_MODEL_IMAGE, STEP_MODEL_REASONING):
            raise ValueError(f'tool-reasoning step {index} `model` must be "image" or "reasoning"')
        steps.append({"prompt": prompt.strip(), "model": model})
    return steps


def plan_node(state: WorkflowState, config=None, *, llm: LlmService, prompts, settings) -> dict:
    """Fetch the tool-reasoning prompt and ask the vision model for an ordered plan."""
    prompt_text = prompts.get_text(settings.TOOL_REASONING_PROMPT_NAME)
    raw = message_text(
        llm.invoke_vision_prompt(
            state["provider"],
            prompt_text,
            config=config,
        )
    )
    return {"plan": parse_steps(raw)}


def vision_extract_node(state: WorkflowState, config=None, *, llm: LlmService, prompts, settings) -> dict:
    """Run step 0 (always a vision step) to produce the extracted text."""
    first = state["plan"][0]
    if first["model"] != STEP_MODEL_IMAGE:
        raise ValueError(
            "tool-reasoning step 0 cannot use model `reasoning` — needs prior image output"
        )
    prompt_text = prompts.get_text(first["prompt"])
    output = message_text(
        llm.invoke_vision_prompt(
            state["provider"],
            prompt_text,
            config=config,
        )
    )
    return {"outputs": [output], "extracted_text": output}


def retrieve_node(state: WorkflowState, *, rag, settings) -> dict:
    """RAG: fetch reference format templates / examples keyed by the extracted text.
    No-op (and never fatal) when RAG is disabled or unavailable."""
    if not settings.RAG_ENABLED or rag is None:
        return {"retrieved": ""}
    return {"retrieved": rag.retrieve(state.get("extracted_text", ""))}


def normalize_node(state: WorkflowState, config=None, *, llm: LlmService, prompts, settings) -> dict:
    """Run the remaining steps. Reasoning steps receive the retrieved reference
    formats so the structured output stays consistent across documents."""
    steps = state["plan"]
    outputs = list(state.get("outputs", []))
    retrieved = state.get("retrieved", "")
    provider = state["provider"]

    for index in range(1, len(steps)):
        step = steps[index]
        prompt_text = prompts.get_text(step["prompt"])
        if step["model"] == STEP_MODEL_IMAGE:
            output = message_text(
                llm.invoke_vision_prompt(
                    provider,
                    prompt_text,
                    config=config,
                )
            )
        else:
            previous = outputs[index - 1]
            system_prompt = prompt_text
            if retrieved:
                system_prompt = (
                    f"{prompt_text}\n\n"
                    "# Reference formats and examples (use them to keep output consistent):\n"
                    f"{retrieved}"
                )
            output = message_text(
                llm.invoke_reasoning(provider, reasoning_messages(system_prompt, previous))
            )
        outputs.append(output)

    return {"outputs": outputs}


def finalize_node(state: WorkflowState) -> dict:
    """First step output is the extracted text; the last is the final text
    (parity with `runLlmPipeline`)."""
    outputs = state.get("outputs", [])
    return {
        "extracted_text": outputs[0] if outputs else "",
        "final_text": outputs[-1] if outputs else "",
    }
