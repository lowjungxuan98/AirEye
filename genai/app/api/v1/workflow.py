from fastapi import APIRouter, Depends, Request

from app.core.security import require_api_key
from app.schemas.workflow import WorkflowRunRequest, WorkflowRunResponse
from app.services.workflow import WorkflowRunner

router = APIRouter()


@router.post(
    "/v1/workflow/run",
    response_model=WorkflowRunResponse,
    dependencies=[Depends(require_api_key)],
)
def run_workflow(payload: WorkflowRunRequest, request: Request) -> WorkflowRunResponse:
    runner: WorkflowRunner = request.app.state.workflow_runner
    return runner.run(payload)
