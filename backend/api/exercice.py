"""
API exercice — correction multi-agent via LangGraph.

Endpoints :
  POST /api/exercice/correct         → réponse JSON complète
  POST /api/exercice/correct/stream  → SSE avec events de phase + tokens LLM
"""
import json
import logging
import uuid

import anthropic
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agents.graph import get_graph, make_initial_state
from agents.specialists.mathematiques import MathematiquesSpecialist
from agents.specialists.francais import FrancaisSpecialist
from agents.specialists.physique_chimie import PhysiqueChimieSpecialist
from agents.specialists.svt import SVTSpecialist
from agents.specialists.histoire_geo import HistoireGeoSpecialist
from agents.specialists.anglais import AnglaisSpecialist
from agents.specialists.philosophie import PhilosophieSpecialist
from agents.nodes.orchestrator import _resolve_subject, _resolve_level, _build_rag_query
from agents.nodes.evaluator import evaluator_node
from rag.ocr import extract_exercise_from_image
from rag.retrieval import search_relevant_chunks
from config import get_settings

logger = logging.getLogger("studybuddy.exercice")
router = APIRouter()
settings = get_settings()
async_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}

# Singletons des spécialistes (réutilisés dans le streaming)
_SPECIALISTS = {
    "mathematiques": MathematiquesSpecialist(),
    "francais": FrancaisSpecialist(),
    "physique_chimie": PhysiqueChimieSpecialist(),
    "svt": SVTSpecialist(),
    "histoire_geo": HistoireGeoSpecialist(),
    "anglais": AnglaisSpecialist(),
    "philosophie": PhilosophieSpecialist(),
}


class CorrectionResponse(BaseModel):
    session_id: str
    exercise_statement: str
    subject: str
    level: str
    exercise_type: str
    specialist_used: str
    correction: str
    sources_used: list[str]
    chunks_found: int
    evaluation_score: float
    rag_iterations: int


def _validate_image(file: UploadFile, image_bytes: bytes) -> None:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Format non supporté. Formats acceptés : JPEG, PNG, WEBP, HEIC",
        )
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="Image trop lourde (max 10 MB)")


@router.post("/correct", response_model=CorrectionResponse)
async def correct_exercise(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    subject: str = Form(None),
    student_answer: str = Form(None),
):
    """
    Correction complète via le graphe LangGraph multi-agent.

    Flux : OCR → Orchestrateur → RAG → Spécialiste (matière + niveau)
           → [re-query RAG si besoin] → Évaluateur → [révision si besoin] → Sortie
    """
    image_bytes = await file.read()
    _validate_image(file, image_bytes)

    initial_state = make_initial_state(
        image_bytes=image_bytes,
        user_id=user_id,
        student_answer=student_answer,
        subject_override=subject,
        stream_enabled=False,
    )

    graph = get_graph()
    result = await graph.ainvoke(initial_state)

    if result.get("error"):
        raise HTTPException(status_code=422, detail=result["error"])

    return CorrectionResponse(
        session_id=result.get("session_id", ""),
        exercise_statement=result.get("exercise_statement", ""),
        subject=result.get("routed_subject", ""),
        level=result.get("routed_level", ""),
        exercise_type=result.get("exercise_type", ""),
        specialist_used=result.get("specialist_used", ""),
        correction=result.get("final_response", ""),
        sources_used=result.get("sources_used", []),
        chunks_found=result.get("chunks_found", 0),
        evaluation_score=result.get("evaluation_score", 0.0),
        rag_iterations=result.get("rag_iterations", 0),
    )


@router.post("/correct/stream")
async def correct_exercise_stream(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    subject: str = Form(None),
    student_answer: str = Form(None),
):
    """
    Correction avec streaming SSE — affichage progressif côté frontend.

    Séquence d'events garantie :
      {"type": "start", "session_id": "..."}
      {"type": "phase", "phase": "ocr", "status": "done", ...}
      {"type": "phase", "phase": "rag", "status": "done", "chunks_found": N}
      {"type": "phase", "phase": "specialist", "specialist": "...", "level": "..."}
      {"type": "token", "text": "..."}   ← tokens LLM en temps réel
      {"type": "phase", "phase": "evaluating", "status": "done"}
      {"type": "done", "sources": [...], "evaluation_score": 0.85}
    """
    image_bytes = await file.read()
    _validate_image(file, image_bytes)

    async def generate():
        session_id = str(uuid.uuid4())

        def sse(data: dict) -> str:
            return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

        logger.info("[STREAM] session=%s user=%s", session_id, user_id)
        yield sse({"type": "start", "session_id": session_id})

        # ── Phase 1 : OCR ─────────────────────────────────────────────────────
        logger.info("[STREAM] phase OCR start")
        yield sse({"type": "phase", "phase": "ocr", "status": "running"})
        try:
            exercise = await extract_exercise_from_image(image_bytes)
        except Exception as e:
            logger.error("[STREAM] OCR ERREUR: %s", e, exc_info=True)
            yield sse({"type": "error", "code": "OCR_FAILED", "message": str(e)})
            return

        if not exercise.statement:
            yield sse({"type": "error", "code": "OCR_EMPTY",
                       "message": "Impossible d'extraire l'énoncé. Vérifiez la qualité de la photo."})
            return

        logger.info("[STREAM] OCR OK - enonce=%d chars matiere=%s type=%s", len(exercise.statement), exercise.subject, exercise.exercise_type)
        yield sse({
            "type": "phase", "phase": "ocr", "status": "done",
            "subject": exercise.subject, "exercise_type": exercise.exercise_type,
        })

        # ── Phase 2 : Routing (orchestrateur, sans LLM) ───────────────────────
        temp_state = {  # type: ignore[typeddict-item]
            "subject_override": subject,
            "detected_subject": exercise.subject,
            "detected_level": None,
        }
        routed_subject = _resolve_subject(temp_state)  # type: ignore[arg-type]
        routed_level = _resolve_level(temp_state)      # type: ignore[arg-type]
        rag_query = _build_rag_query(exercise.statement, routed_subject, routed_level)

        # ── Phase 3 : RAG ─────────────────────────────────────────────────────
        logger.info("[STREAM] phase RAG start - query=%s", rag_query[:80])
        yield sse({"type": "phase", "phase": "rag", "status": "running"})
        try:
            chunks = await search_relevant_chunks(
                query=rag_query,
                user_id=user_id,
                subject=routed_subject,
                top_k=settings.specialist_top_k,
            )
        except Exception as e:
            logger.error("[STREAM] RAG ERREUR: %s", e, exc_info=True)
            chunks = []

        chunks_dicts = [
            {
                "content": c.content, "course_title": c.course_title,
                "subject": c.subject, "similarity": c.similarity,
                "chunk_index": c.chunk_index, "course_id": c.course_id,
            }
            for c in chunks
        ]
        logger.info("[STREAM] RAG OK - %d chunks trouves", len(chunks_dicts))
        yield sse({"type": "phase", "phase": "rag", "status": "done", "chunks_found": len(chunks_dicts)})

        # ── Phase 4 : Spécialiste (streaming tokens) ──────────────────────────
        specialist = _SPECIALISTS.get(routed_subject, _SPECIALISTS["mathematiques"])
        yield sse({
            "type": "phase", "phase": "specialist", "status": "running",
            "specialist": routed_subject, "level": routed_level,
        })

        stream_state = make_initial_state(
            image_bytes=image_bytes,
            user_id=user_id,
            student_answer=student_answer,
            subject_override=subject,
            stream_enabled=True,
        )
        stream_state["exercise_statement"] = exercise.statement
        stream_state["routed_subject"] = routed_subject
        stream_state["routed_level"] = routed_level
        stream_state["retrieved_chunks"] = chunks_dicts
        stream_state["session_id"] = session_id

        logger.info("[STREAM] phase SPECIALIST start - %s niveau=%s", routed_subject, routed_level)
        full_response = ""
        async for token in specialist.run_stream(stream_state):
            full_response += token
            yield sse({"type": "token", "text": token})

        # ── Phase 5 : Évaluation (silencieuse, non streamée) ─────────────────
        yield sse({"type": "phase", "phase": "evaluating", "status": "running"})

        eval_state = dict(stream_state)
        eval_state["specialist_response"] = full_response
        eval_result = await evaluator_node(eval_state)  # type: ignore[arg-type]

        logger.info("[STREAM] evaluation OK - score=%.2f", eval_result.get("evaluation_score", 0))
        yield sse({"type": "phase", "phase": "evaluating", "status": "done"})

        # ── Finalisation ──────────────────────────────────────────────────────
        sources = list({f"{c['course_title']} ({c['subject']})" for c in chunks_dicts})
        logger.info("[STREAM] SUCCES session=%s score=%.2f sources=%d", session_id, eval_result.get("evaluation_score", 0), len(chunks_dicts))
        yield sse({
            "type": "done",
            "session_id": session_id,
            "sources": sources,
            "chunks_found": len(chunks_dicts),
            "evaluation_score": eval_result.get("evaluation_score", 0.8),
            "specialist": routed_subject,
            "level": routed_level,
        })

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/followup/stream")
async def followup_stream(
    user_id: str = Form(...),
    routed_subject: str = Form(...),
    level: str = Form(...),
    conversation_history: str = Form(...),  # JSON: [{role, content}, ...]
    message: str = Form(...),
):
    """
    Conversation de suivi post-correction — human in the loop.
    L'élève pose une question de clarification ; le spécialiste répond
    en s'appuyant sur les mêmes extraits de cours (nouveau RAG query).
    """
    async def generate():
        def sse(data: dict) -> str:
            return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

        # Historique de conversation
        try:
            history: list[dict] = json.loads(conversation_history)
        except Exception:
            history = []

        # RAG : nouveaux chunks pertinents pour la question de l'élève
        try:
            chunks = await search_relevant_chunks(
                query=message,
                user_id=user_id,
                subject=routed_subject,
                top_k=settings.specialist_top_k,
            )
        except Exception as e:
            logger.warning("[FOLLOWUP] RAG ERREUR: %s", e)
            chunks = []

        chunks_dicts = [
            {
                "content": c.content, "course_title": c.course_title,
                "subject": c.subject, "similarity": c.similarity,
                "chunk_index": c.chunk_index, "course_id": c.course_id,
            }
            for c in chunks
        ]

        # System prompt via le spécialiste correspondant
        specialist = _SPECIALISTS.get(routed_subject, _SPECIALISTS["mathematiques"])
        temp_state: dict = {"routed_level": level, "retrieved_chunks": chunks_dicts}
        system_prompt = specialist.build_system_prompt(temp_state)  # type: ignore[arg-type]

        # Messages : historique + nouvelle question
        messages = history + [{"role": "user", "content": message}]

        logger.info("[FOLLOWUP] user=%s subject=%s history=%d", user_id, routed_subject, len(history))
        yield sse({"type": "start"})

        async with async_client.messages.stream(
            model=settings.correction_model,
            max_tokens=settings.specialist_max_tokens,
            system=system_prompt,
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                yield sse({"type": "token", "text": text})

        yield sse({"type": "done"})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
