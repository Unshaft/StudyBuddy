"""
Noeud orchestrateur — arbitre matière + niveau, construit la requête RAG initiale.
Aucun appel LLM : logique Python déterministe (rapide, gratuit).
"""
from agents.state import AgentState, SubjectType, SchoolLevel, normalize_subject, LEVEL_GROUP

# Niveau par défaut si non détecté (niveau médian du collège)
DEFAULT_LEVEL: SchoolLevel = "3ème"
DEFAULT_SUBJECT: SubjectType = "mathematiques"


def _resolve_subject(state: AgentState) -> SubjectType:
    """
    Priorité : subject_override > detected_subject > DEFAULT_SUBJECT
    """
    if state.get("subject_override"):
        return normalize_subject(state["subject_override"])

    if state.get("detected_subject"):
        normalized = normalize_subject(state["detected_subject"])
        return normalized

    return DEFAULT_SUBJECT


def _resolve_level(state: AgentState) -> SchoolLevel:
    """
    Priorité : detected_level (depuis profil utilisateur futur ou OCR cours) > DEFAULT_LEVEL
    """
    detected = state.get("detected_level")
    if detected and detected in LEVEL_GROUP:
        return detected  # type: ignore[return-value]
    return DEFAULT_LEVEL


def _build_rag_query(exercise_statement: str, subject: SubjectType, level: SchoolLevel) -> str:
    """Construit la requête RAG initiale à partir du contexte résolu."""
    subject_label = subject.replace("_", " ").title()
    # Tronquer l'énoncé pour la requête (les 300 premiers caractères suffisent)
    statement_excerpt = exercise_statement[:300].strip()
    return f"{subject_label} niveau {level}: {statement_excerpt}"


async def orchestrator_node(state: AgentState) -> dict:
    """
    Entrée : detected_subject, detected_level, subject_override, exercise_statement
    Sortie : routed_subject, routed_level, rag_query
    """
    # Arrêt précoce si l'OCR a échoué
    if state.get("error"):
        return {}

    routed_subject = _resolve_subject(state)
    routed_level = _resolve_level(state)
    rag_query = _build_rag_query(
        state.get("exercise_statement", ""),
        routed_subject,
        routed_level,
    )

    return {
        "routed_subject": routed_subject,
        "routed_level": routed_level,
        "rag_query": rag_query,
        "rag_iterations": 0,
        "revision_count": 0,
        "tool_calls_made": [],
        "specialist_used": routed_subject,
    }
