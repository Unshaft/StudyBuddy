"""
API cours - ingestion de cours via photo (OCR + chunking + embedding + stockage).
"""
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from db.client import get_supabase
from rag.ocr import extract_course_from_image
from rag.chunking import chunk_course_text
from rag.embeddings import embed_chunks
from rag.retrieval import store_chunks, delete_course_chunks

logger = logging.getLogger("studybuddy.cours")
router = APIRouter()

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}


class CourseResponse(BaseModel):
    id: str
    title: str
    subject: str
    level: str
    keywords: list[str]
    chunk_count: int
    created_at: str


class CourseListItem(BaseModel):
    id: str
    title: str
    subject: str
    level: str
    created_at: str


@router.post("/upload", response_model=CourseResponse, status_code=201)
async def upload_course(
    file: UploadFile = File(...),
    user_id: str = Form(...),
):
    logger.info("[UPLOAD] debut - user=%s fichier=%s type=%s", user_id, file.filename, file.content_type)

    if file.content_type not in ALLOWED_TYPES:
        logger.warning("[UPLOAD] type refuse: %s", file.content_type)
        raise HTTPException(status_code=400, detail="Format non supporte. Formats acceptes : JPEG, PNG, WEBP, HEIC")

    image_bytes = await file.read()
    logger.info("[UPLOAD] taille image: %.1f KB", len(image_bytes) / 1024)

    if len(image_bytes) > MAX_IMAGE_SIZE:
        logger.warning("[UPLOAD] image trop lourde: %d bytes", len(image_bytes))
        raise HTTPException(status_code=413, detail="Image trop lourde. Taille maximale : 10 MB")

    # 1. OCR via Claude Vision
    logger.info("[UPLOAD] etape 1/4 - OCR Claude Vision...")
    try:
        ocr_result = await extract_course_from_image(image_bytes)
        logger.info("[UPLOAD] OCR OK - titre=%s matiere=%s niveau=%s contenu=%d chars",
                    ocr_result.title, ocr_result.subject, ocr_result.level, len(ocr_result.content or ""))
    except Exception as e:
        logger.error("[UPLOAD] OCR ERREUR: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur OCR: {str(e)}")

    if not ocr_result.content:
        logger.warning("[UPLOAD] OCR vide - pas de texte extrait")
        raise HTTPException(status_code=422, detail="Impossible d extraire du texte de cette image.")

    # 2. Creer l entree cours en DB
    logger.info("[UPLOAD] etape 2/4 - insertion Supabase...")
    try:
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
        logger.info("[UPLOAD] DB OK - course_id=%s", course_id)
    except Exception as e:
        logger.error("[UPLOAD] DB ERREUR: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur base de donnees: {str(e)}")

    # 3. Chunking
    logger.info("[UPLOAD] etape 3/4 - chunking...")
    try:
        chunks = chunk_course_text(
            text=ocr_result.content,
            course_id=course_id,
            subject=ocr_result.subject,
            title=ocr_result.title,
            keywords=ocr_result.keywords,
        )
        logger.info("[UPLOAD] chunking OK - %d chunks", len(chunks))
    except Exception as e:
        logger.error("[UPLOAD] chunking ERREUR: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur chunking: {str(e)}")

    # 4. Embedding + stockage
    logger.info("[UPLOAD] etape 4/4 - embedding Voyage AI + stockage pgvector...")
    try:
        chunks_with_embeddings = await embed_chunks(chunks)
        logger.info("[UPLOAD] embedding OK - %d vecteurs", len(chunks_with_embeddings))
        await store_chunks(chunks_with_embeddings=chunks_with_embeddings, user_id=user_id, course_id=course_id)
        logger.info("[UPLOAD] stockage pgvector OK")
    except Exception as e:
        logger.error("[UPLOAD] embedding/stockage ERREUR: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur embedding: {str(e)}")

    logger.info("[UPLOAD] SUCCES - course_id=%s chunks=%d", course_id, len(chunks))
    return CourseResponse(
        id=course_id,
        title=ocr_result.title,
        subject=ocr_result.subject,
        level=ocr_result.level,
        keywords=ocr_result.keywords,
        chunk_count=len(chunks),
        created_at=now,
    )


@router.get("/", response_model=list[CourseListItem])
def list_courses(user_id: str):
    logger.info("[LIST] user=%s", user_id)
    supabase = get_supabase()
    result = (
        supabase.table("courses")
        .select("id, title, subject, level, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    logger.info("[LIST] %d cours trouves", len(result.data))
    return result.data


@router.delete("/{course_id}", status_code=204)
async def delete_course(course_id: str, user_id: str):
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
        logger.warning("[DELETE] cours introuvable course_id=%s", course_id)
        raise HTTPException(status_code=404, detail="Cours introuvable")
    await delete_course_chunks(course_id)
    supabase.table("courses").delete().eq("id", course_id).execute()
    logger.info("[DELETE] SUCCES course_id=%s", course_id)
