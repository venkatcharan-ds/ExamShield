"""
ExamShield Backend — FastAPI Application
Privacy-first AI exam integrity platform
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from api.routes import router
from ml.isolation_forest import engine  # triggers pre-training on import


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 50)
    print("  ExamShield AI Engine — Starting Up")
    print(f"  Isolation Forest: {'Ready ✓' if engine._is_trained else 'Training...'}")
    print("=" * 50)
    yield
    print("[ExamShield] Shutting down.")


app = FastAPI(
    title="ExamShield API",
    description="Privacy-first AI examination integrity platform",
    version="1.0.0",
    lifespan=lifespan,
)

_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(router)


@app.get("/")
async def root():
    return {
        "product": "ExamShield",
        "version": "1.0.0",
        "status": "running",
        "tagline": "No camera. No surveillance. Just AI that understands behavior.",
    }
