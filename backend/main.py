import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from api import cours, exercice

# Configuration du logging global (visible dans Railway)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("studybuddy")

settings = get_settings()
logger.info("StudyBuddy API demarrage - env=%s", settings.environment)

app = FastAPI(
    title="StudyBuddy API",
    description="API d aide aux devoirs - OCR, RAG et correction pas-a-pas",
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
