"""
API cours — ingestion de cours via photo (OCR + chunking + embedding + stockage).
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from db.client import get_supabase
from rag.ocr import extract_course_from_image
from rag.chunking import chunk_course_text
from rag.embeddings import embed_chunks
from rag.retrieval import store_chunks, delete_course_chunks

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
    """
    Upload une photo de cours → OCR → vectorisation → stockage.

    - Accepte JPEG, PNG, WEBP, HEIC
    - Extrait le texte via Claude Vision
    - Vectorise et stocke dans pgvector
    """
    # Validation du fichier
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Format non supporté. Formats acceptés : JPEG, PNG, WEBP, HEIC",
        )

    image_bytes = await file.read()

    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image trop lourde. Taille maximale : 10 MB",
        )

    # 1. OCR via Claude Vision
    ocr_result = await extract_course_from_image(image_bytes)

    if not ocr_result.content:
        raise HTTPException(
            status_code=422,
            detail="Impossible d'extraire du texte de cette image. Vérifiez la qualité de la photo.",
        )

    # 2. Créer l'entrée cours en DB
    supabase = get_supabase()
    course_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    supabase.table("courses").insert(
        {
            "id": course_id,
            "user_id": user_id,
            "title": ocr_result.title,
            "subject": ocr_result.subject,
            "level": ocr_result.level,
            "keywords": ocr_result.keywords,
            "raw_content": ocr_result.content,
            "created_at": now,
        }
    ).execute()

    # 3. Chunking
    chunks = chunk_course_text(
        text=ocr_result.content,
        course_id=course_id,
        subject=ocr_result.subject,
        title=ocr_result.title,
        keywords=ocr_result.keywords,
    )

    # 4. Embedding
    chunks_with_embeddings = await embed_chunks(chunks)

    # 5. Stockage dans pgvector
    await store_chunks(
        chunks_with_embeddings=chunks_with_embeddings,
        user_id=user_id,
        course_id=course_id,
    )

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
    """Liste tous les cours d'un utilisateur."""
    supabase = get_supabase()
    result = (
        supabase.table("courses")
        .select("id, title, subject, level, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.delete("/{course_id}", status_code=204)
async def delete_course(course_id: str, user_id: str):
    """Supprime un cours et tous ses chunks vectorisés."""
    supabase = get_supabase()

    # Vérifie que le cours appartient à l'utilisateur
    result = (
        supabase.table("courses")
        .select("id")
        .eq("id", course_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Cours introuvable")

    # Supprime les chunks vectorisés
    await delete_course_chunks(course_id)

    # Supprime le cours
    supabase.table("courses").delete().eq("id", course_id).execute()
