"""Test doubles for the LangGraph dependencies (no network, deterministic)."""

PLAN_JSON = (
    '{"steps":[{"prompt":"extract","model":"image"},'
    '{"prompt":"normalize","model":"reasoning"}]}'
)

PROMPT_TEXT = {
    "tool-reasoning": "PLAN_PROMPT",
    "extract": "EXTRACT_PROMPT",
    "normalize": "NORMALIZE_PROMPT",
}


class FakeMessage:
    def __init__(self, content: str):
        self.content = content


def _first_text(messages) -> str:
    content = messages[0].content
    if isinstance(content, list):
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                return part.get("text", "")
    return content if isinstance(content, str) else ""


class FakeVisionModel:
    def invoke(self, messages, config=None) -> FakeMessage:
        text = _first_text(messages)
        if "PLAN" in text:
            return FakeMessage(PLAN_JSON)
        return FakeMessage("EXTRACTED")


class FakeReasoningModel:
    def __init__(self):
        self.last_system: str | None = None
        self.last_user: str | None = None

    def invoke(self, messages, config=None) -> FakeMessage:
        self.last_system = messages[0].content
        self.last_user = messages[1].content
        return FakeMessage("NORMALIZED")


class FakeLlm:
    def __init__(self):
        self.reasoning_model = FakeReasoningModel()
        self.vision_model = FakeVisionModel()

    def invoke_vision(self, provider: str, messages):
        return self.vision_model.invoke(messages)

    def invoke_reasoning(self, provider: str, messages):
        return self.reasoning_model.invoke(messages)


class FakePrompts:
    def get_text(self, name: str, label: str | None = None) -> str:
        return PROMPT_TEXT.get(name, name)


class FakeRag:
    def __init__(self, context: str = "TEMPLATE_CONTEXT"):
        self.context = context
        self.queries: list[str] = []

    def retrieve(self, query: str) -> str:
        self.queries.append(query)
        return self.context
