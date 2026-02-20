"""
API cours - ingestion de cours via photo (OCR + chunking + embedding + stockage).
Upload asynchrone : retourne un job_id immédiatement, poll GET /jobs/{job_id}.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel

from api.auth import get_current_user_id
from api.ratelimit import limiter
from db.client import get_supabase
from rag.ocr import extract_course_from_image
from rag.chunking import chunk_course_text
from rag.embeddings import embed_chunks
from rag.retrieval import store_chunks, delete_course_chunks

logger = logging.getLogger("studybuddy.cours")
router = APIRouter()

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}

# In-memory job store — acceptable pour un déploiement single-instance (Railway MVP)
# Jobs sont courts (< 30s), une perte sur restart force juste un retry côté user
_JOBS: dict[str, dict] = {}


# ── Modèles ──────────────────────────────────────────────────────────────────

class CourseResponse(BaseModel):
    id: str
    title: str
    subject: str
    level: str
    keywords: list[str]
    chunk_count: int
    created_at: str


class UploadJobResponse(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "done", "error"]
    course: CourseResponse | None = None
    error: str | None = None


class CourseListItem(BaseModel):
    id: str
    title: str
    subject: str
    level: str
    keywords: list[str] = []
    created_at: str


class CourseDetail(BaseModel):
    id: str
    title: str
    subject: str
    level: str
    keywords: list[str] = []
    raw_content: str
    created_at: str


# ── Background task ───────────────────────────────────────────────────────────

async def _process_upload(job_id: str, image_bytes: bytes, user_id: str) -> None:
    """OCR → chunking → embedding → stockage pgvector. Résultat dans _JOBS[job_id]."""
    _JOBS[job_id] = {"status": "processing"}
    logger.info("[UPLOAD] background start job=%s user=%s", job_id, user_id)

    try:
        # 1. OCR
        ocr_result = await extract_course_from_image(image_bytes)
        if not ocr_result.content:
            _JOBS[job_id] = {"status": "error", "error": "Impossible d'extraire du texte de cette image."}
            return

        logger.info("[UPLOAD] OCR OK job=%s titre=%s", job_id, ocr_result.title)

        # 2. Insertion en base
        supabase = get_supabase()
        course_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        supabase.table("courses").insert({
            "id": course_id,
            "user_id": user_id,
            "title": ocr_result.title,
            "subject": ocr_result.subject,
            "level": ocr_result.level,
            "keywords": ocr_result.keywords,
            "raw_content": ocr_result.content,
            "created_at": now,
        }).execute()

        # 3. Chunking
        chunks = chunk_course_text(
            text=ocr_result.content,
            course_id=course_id,
            subject=ocr_result.subject,
            title=ocr_result.title,
            keywords=ocr_result.keywords,
        )

        # 4. Embedding + stockage pgvector
        chunks_with_embeddings = await embed_chunks(chunks)
        await store_chunks(chunks_with_embeddings=chunks_with_embeddings, user_id=user_id, course_id=course_id)

        logger.info("[UPLOAD] SUCCES job=%s course_id=%s chunks=%d", job_id, course_id, len(chunks))

        _JOBS[job_id] = {
            "status": "done",
            "course": CourseResponse(
                id=course_id,
                title=ocr_result.title,
                subject=ocr_result.subject,
                level=ocr_result.level,
                keywords=ocr_result.keywords,
                chunk_count=len(chunks),
                created_at=now,
            ),
        }

    except Exception as e:
        logger.error("[UPLOAD] ERREUR job=%s: %s", job_id, e, exc_info=True)
        _JOBS[job_id] = {"status": "error", "error": str(e)}


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/upload", response_model=UploadJobResponse, status_code=202)
@limiter.limit("5/minute")
async def upload_course(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    """
    Upload asynchrone d'un cours.
    Retourne immédiatement {job_id, status:'queued'}.
    Poll GET /jobs/{job_id} toutes les 2s pour suivre le traitement.
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Format non supporté. Formats acceptés : JPEG, PNG, WEBP, HEIC",
        )

    image_bytes = await file.read()
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="Image trop lourde. Taille maximale : 10 MB")

    job_id = str(uuid.uuid4())
    _JOBS[job_id] = {"status": "queued"}
    background_tasks.add_task(_process_upload, job_id, image_bytes, user_id)

    logger.info("[UPLOAD] job queued job_id=%s user=%s fichier=%s", job_id, user_id, file.filename)
    return UploadJobResponse(job_id=job_id, status="queued")


@router.get("/jobs/{job_id}", response_model=UploadJobResponse)
async def get_upload_job(
    job_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Retourne le statut d'un job d'upload."""
    job = _JOBS.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job introuvable (expiré ou inexistant)")

    return UploadJobResponse(
        job_id=job_id,
        status=job.get("status", "queued"),
        course=job.get("course"),
        error=job.get("error"),
    )


@router.get("/", response_model=list[CourseListItem])
def list_courses(user_id: str = Depends(get_current_user_id)):
    logger.info("[LIST] user=%s", user_id)
    supabase = get_supabase()
    result = (
        supabase.table("courses")
        .select("id, title, subject, level, keywords, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    logger.info("[LIST] %d cours trouvés", len(result.data))
    return result.data


@router.get("/{course_id}", response_model=CourseDetail)
def get_course(
    course_id: str,
    user_id: str = Depends(get_current_user_id),
):
    logger.info("[GET] course_id=%s user=%s", course_id, user_id)
    supabase = get_supabase()
    result = (
        supabase.table("courses")
        .select("id, title, subject, level, keywords, raw_content, created_at")
        .eq("id", course_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Cours introuvable")
    return result.data


@router.delete("/{course_id}", status_code=204)
async def delete_course(
    course_id: str,
    user_id: str = Depends(get_current_user_id),
):
    logger.info("[DELETE] course_id=%s user=%s", course_id, user_id)
    supabase = get_supabase()
    result = (
        supabase.table("courses")
        .select("id")
        .eq("id", course_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Cours introuvable")
    await delete_course_chunks(course_id)
    supabase.table("courses").delete().eq("id", course_id).execute()
    logger.info("[DELETE] SUCCES course_id=%s", course_id)
