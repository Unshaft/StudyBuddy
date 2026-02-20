"""
Dépendance FastAPI — authentification JWT Supabase.

Supabase utilise ES256 (ECC P-256) pour signer les JWT depuis la rotation des clés.
La vérification se fait via le endpoint JWKS public de Supabase.

Usage dans une route :
    from api.auth import get_current_user_id
    user_id: str = Depends(get_current_user_id)
"""
import logging

import httpx
from fastapi import Header, HTTPException, status
from jose import JWTError, jwt

from config import get_settings

logger = logging.getLogger("studybuddy.auth")

# Cache in-memory du JWKS (rechargé si None)
_jwks_cache: dict | None = None


async def _get_jwks() -> dict:
    """Récupère et met en cache le JWKS depuis Supabase."""
    global _jwks_cache
    if _jwks_cache is None:
        settings = get_settings()
        url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        async with httpx.AsyncClient() as client:
            r = await client.get(url, timeout=5.0)
            r.raise_for_status()
            _jwks_cache = r.json()
    return _jwks_cache


async def get_current_user_id(
    authorization: str = Header(..., alias="Authorization"),
) -> str:
    """Extrait et valide le user_id depuis le JWT Supabase (ES256 via JWKS)."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token d'authentification manquant ou invalide",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ", 1)[1]
    settings = get_settings()

    # Essaie ES256 via JWKS (clé actuelle Supabase)
    try:
        jwks = await _get_jwks()
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["ES256"],
            options={"verify_aud": False},
        )
    except JWTError as es_err:
        # Fallback HS256 pour les tokens émis avant la rotation des clés
        if settings.supabase_jwt_secret:
            try:
                payload = jwt.decode(
                    token,
                    settings.supabase_jwt_secret,
                    algorithms=["HS256"],
                    options={"verify_aud": False},
                )
            except JWTError as hs_err:
                logger.warning("[AUTH] JWT invalide (ES256: %s | HS256: %s)", es_err, hs_err)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token invalide ou expiré",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        else:
            logger.warning("[AUTH] JWT invalide: %s", es_err)
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
