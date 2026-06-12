from collections.abc import Callable
from typing import Any

from app.core.config import Settings
from app.schemas.workflow import WorkflowRunRequest


def build_langsmith_target(runner) -> Callable[[dict[str, Any]], dict[str, Any]]:
    def target(inputs: dict[str, Any]) -> dict[str, Any]:
        response = runner.run(WorkflowRunRequest(**inputs))
        return response.model_dump(by_alias=True)

    return target


def extracted_text_present(outputs: dict[str, Any], reference_outputs: dict[str, Any] | None = None) -> bool:
    return bool(str(outputs.get("extractedText", "")).strip())


def final_text_present(outputs: dict[str, Any], reference_outputs: dict[str, Any] | None = None) -> bool:
    return bool(str(outputs.get("finalText", "")).strip())


def final_text_matches_reference(
    outputs: dict[str, Any],
    reference_outputs: dict[str, Any] | None = None,
) -> bool | None:
    expected = (reference_outputs or {}).get("finalText")
    if expected is None:
        return None
    return str(outputs.get("finalText", "")).strip() == str(expected).strip()


def run_langsmith_evaluation(settings: Settings, runner, dataset_name: str | None = None):
    from langsmith import evaluate

    return evaluate(
        build_langsmith_target(runner),
        data=dataset_name or settings.LANGSMITH_DATASET_NAME,
        evaluators=[
            extracted_text_present,
            final_text_present,
            final_text_matches_reference,
        ],
        experiment_prefix="aireye-genai",
        metadata={
            "project": settings.LANGSMITH_PROJECT,
            "prompt_provider": settings.prompt_provider,
        },
    )
