from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from api import cours, exercice

settings = get_settings()

app = FastAPI(
    title="StudyBuddy API",
    description="API d'aide aux devoirs — OCR, RAG et correction pas-à-pas",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cours.router, prefix="/api/cours", tags=["cours"])
app.include_router(exercice.router, prefix="/api/exercice", tags=["exercice"])


@app.get("/health")
def health_check():
    return {"status": "ok", "version": "0.1.0"}
