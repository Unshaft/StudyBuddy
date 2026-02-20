"""
POST /api/feedback — retours 👍/👎 sur les corrections.
"""
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.auth import get_current_user_id
from db.client import get_supabase

logger = logging.getLogger("studybuddy.feedback")
router = APIRouter()


class FeedbackRequest(BaseModel):
    session_id: str
    rating: int  # 1 (👍) ou -1 (👎)
    comment: str | None = None


@router.post("", status_code=201)
async def submit_feedback(
    body: FeedbackRequest,
    user_id: str = Depends(get_current_user_id),
):
    if body.rating not in (1, -1):
        raise HTTPException(status_code=400, detail="Le rating doit être 1 ou -1")

    supabase = get_supabase()
    supabase.table("correction_feedback").insert({
        "id": str(uuid.uuid4()),
        "session_id": body.session_id,
        "user_id": user_id,
        "rating": body.rating,
        "comment": body.comment,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    logger.info("[FEEDBACK] user=%s session=%s rating=%d", user_id, body.session_id, body.rating)
    return {"status": "ok"}
