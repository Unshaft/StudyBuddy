"""
État partagé du graphe LangGraph StudyBuddy.
Toutes les clés sont lues/écrites par les noeuds — contrat central de l'architecture.
"""
from typing import TypedDict, Literal

# Types stricts pour matière et niveau
SubjectType = Literal[
    "mathematiques",
    "francais",
    "physique_chimie",
    "svt",
    "histoire_geo",
    "anglais",
    "philosophie",
]

SchoolLevel = Literal[
    "6ème", "5ème", "4ème", "3ème",  # Collège
    "2nde", "1ère", "Terminale",       # Lycée
]

# Groupes de niveaux pour la pédagogie
LEVEL_GROUP = {
    "6ème": "college_debut",
    "5ème": "college_debut",
    "4ème": "college_fin",
    "3ème": "college_fin",
    "2nde": "lycee_debut",
    "1ère": "lycee_milieu",
    "Terminale": "terminale",
}

# Mapping des labels OCR vers les SubjectType
SUBJECT_MAPPING: dict[str, SubjectType] = {
    "mathématiques": "mathematiques",
    "maths": "mathematiques",
    "math": "mathematiques",
    "français": "francais",
    "francais": "francais",
    "littérature": "francais",
    "physique-chimie": "physique_chimie",
    "physique chimie": "physique_chimie",
    "physique": "physique_chimie",
    "chimie": "physique_chimie",
    "svt": "svt",
    "sciences de la vie et de la terre": "svt",
    "biologie": "svt",
    "histoire-géographie": "histoire_geo",
    "histoire géographie": "histoire_geo",
    "histoire": "histoire_geo",
    "géographie": "histoire_geo",
    "géo": "histoire_geo",
    "anglais": "anglais",
    "english": "anglais",
    "lv1": "anglais",
    "philosophie": "philosophie",
    "philo": "philosophie",
}


def normalize_subject(raw_subject: str) -> SubjectType:
    """Normalise un label de matière libre vers un SubjectType."""
    normalized = raw_subject.lower().strip()
    return SUBJECT_MAPPING.get(normalized, "mathematiques")


class AgentState(TypedDict):
    # ── Entrées (remplies par l'API avant d'entrer dans le graphe) ────────────
    user_id: str
    image_bytes: bytes
    student_answer: str | None
    subject_override: str | None      # matière forcée par le frontend
    stream_enabled: bool

    # ── Résultats OCR ─────────────────────────────────────────────────────────
    exercise_statement: str
    detected_subject: str | None      # label brut OCR (ex: "Mathématiques")
    detected_level: str | None        # label brut OCR (ex: "Terminale")
    exercise_type: str                # "Problème", "QCM", "Dissertation", etc.

    # ── Routing ───────────────────────────────────────────────────────────────
    routed_subject: SubjectType
    routed_level: SchoolLevel

    # ── RAG ───────────────────────────────────────────────────────────────────
    rag_query: str
    retrieved_chunks: list[dict]      # dicts sérialisés de RetrievedChunk
    rag_iterations: int

    # ── Correction ────────────────────────────────────────────────────────────
    specialist_response: str
    tool_calls_made: list[str]
    pending_tool_query: str | None    # nouvelle requête RAG demandée par le spécialiste

    # ── Évaluation ────────────────────────────────────────────────────────────
    evaluation_score: float
    evaluation_feedback: str
    needs_revision: bool
    revision_count: int               # nombre de révisions déjà effectuées

    # ── Sortie finale ─────────────────────────────────────────────────────────
    final_response: str
    sources_used: list[str]
    chunks_found: int
    specialist_used: str

    # ── Contrôle flux ─────────────────────────────────────────────────────────
    error: str | None
    session_id: str                   # UUID pour le suivi/audit
