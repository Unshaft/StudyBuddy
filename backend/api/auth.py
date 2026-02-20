"""
Dépendance FastAPI — authentification JWT Supabase.

Usage dans une route :
    from api.auth import get_current_user_id
    user_id: str = Depends(get_current_user_id)
"""
import logging

from fastapi import Header, HTTPException, status
from jose import JWTError, jwt

from config import get_settings

logger = logging.getLogger("studybuddy.auth")


async def get_current_user_id(
    authorization: str = Header(..., alias="Authorization"),
) -> str:
    """Extrait et valide le user_id depuis le JWT Supabase (HS256)."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token d'authentification manquant ou invalide",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ", 1)[1]
    settings = get_settings()

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError as e:
        logger.warning("[AUTH] JWT invalide: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant utilisateur introuvable dans le token",
        )

    return user_id
