from app.core.config import Settings
from app.services.llm import LlmService, _is_unsupported_param_error


class _Resp:
    content = "ok"


def test_is_unsupported_param_error_detects_param_rejection():
    assert _is_unsupported_param_error(
        Exception(
            "Error code: 400 - litellm.UnsupportedParamsError: gpt-5 models don't "
            "support temperature=0.15. Only temperature=1 is supported"
        )
    )
    assert not _is_unsupported_param_error(Exception("connection refused"))


def test_invoke_reasoning_retries_without_temperature(monkeypatch):
    svc = LlmService(Settings(REASONING_TEMPERATURE=0.15))
    temps = []

    def fake_chat(provider, stage, temperature, max_tokens, extra_body=None):
        temps.append(temperature)

        class _Model:
            def invoke(self, messages):
                if temperature is not None:
                    raise Exception(
                        "Error code: 400 - litellm.UnsupportedParamsError: gpt-5 models don't "
                        "support temperature=0.15. Only temperature=1 is supported"
                    )
                return _Resp()

        return _Model()

    monkeypatch.setattr(svc, "_chat", fake_chat)
    result = svc.invoke_reasoning("openai", [])
    assert result.content == "ok"
    assert temps == [0.15, None]  # first attempt with temperature, retry without


def test_invoke_does_not_retry_on_unrelated_errors(monkeypatch):
    svc = LlmService(Settings())
    calls = []

    def fake_chat(provider, stage, temperature, max_tokens, extra_body=None):
        calls.append(temperature)

        class _Model:
            def invoke(self, messages):
                raise RuntimeError("connection refused")

        return _Model()

    monkeypatch.setattr(svc, "_chat", fake_chat)
    try:
        svc.invoke_vision("openai", [])
        raise AssertionError("expected the error to propagate")
    except RuntimeError as error:
        assert "connection refused" in str(error)
    assert len(calls) == 1  # no retry on non-param errors
