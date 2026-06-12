import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.requests import Request
from fastapi.responses import JSONResponse

from app.api.v1 import health, langsmith, workflow
from app.core.config import get_settings
from app.core.observability.langfuse_tracing import init_langfuse
from app.core.observability.langsmith_integration import init_langsmith
from app.services.workflow import WorkflowRunner

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    init_langfuse(settings)
    init_langsmith(settings)
    app.state.workflow_runner = WorkflowRunner(settings)
    yield


app = FastAPI(title="AirEye GenAI", version="0.1.0", lifespan=lifespan)


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"error": {"message": exc.detail}})


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    logging.getLogger(__name__).exception("workflow request failed")
    return JSONResponse(status_code=500, content={"error": {"message": str(exc)}})


app.include_router(health.router)
app.include_router(langsmith.router)
app.include_router(workflow.router)
