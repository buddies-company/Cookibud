"""Main application entry point for Cookibud API."""

import logging
import time

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import iterate_in_threadpool

from drivers.config import settings
from drivers.dependencies import get_token_header
from drivers.routers import auth, groceries, meals, recipes, uploads

logger = logging.getLogger("uvicorn.trace")

app = FastAPI(title="Cookibud API")

origins = [
    "http://localhost:5173",
    settings.frontend_url,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(
    f"/{settings.uploads_dir}",
    StaticFiles(directory=settings.uploads_dir),
    name="static_uploads",
)


@app.middleware("http")
async def middleware(request: Request, call_next):
    """Middleware to log request and response details along with processing time."""
    try:
        req_body = await request.json()
    except Exception:  # pylint: disable=broad-except
        req_body = None

    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time

    res_body = [section async for section in response.body_iterator]
    response.body_iterator = iterate_in_threadpool(iter(res_body))
    try:
        res_body = [section.decode() for section in res_body]
    except Exception:  # pylint: disable=broad-except
        res_body = ["<non-decodable content>"]

    # Add the background task to the response object to queue the job
    logger.debug(
        "GET /",
        extras={
            "request": request,
            "request_body": req_body,
            "response": response,
            "response_body": res_body,
            "process_time": process_time,
        },
    )
    return response


app.include_router(auth.router, tags=["auth"])
app.include_router(
    recipes.router,
    prefix="/recipes",
    tags=["recipes"],
    dependencies=[Depends(get_token_header)],
)
app.include_router(
    meals.router,
    prefix="/meals",
    tags=["meals"],
    dependencies=[Depends(get_token_header)],
)
app.include_router(
    uploads.router,
    prefix="/uploads",
    tags=["uploads"],
    dependencies=[Depends(get_token_header)],
)
app.include_router(
    groceries.router,
    prefix="/groceries",
    tags=["groceries"],
    dependencies=[Depends(get_token_header)],
)
