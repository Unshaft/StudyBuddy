"""
Graphe LangGraph principal de StudyBuddy.

Flux :
  START
    → ocr_node
    → orchestrator_node
    → rag_retrieval_node
    → [specialist_router] → spécialiste selon la matière
    → [after_specialist] → rag_requery_node (si l'agent veut plus de contexte)
                         → evaluator_node
    → [after_evaluator]  → spécialiste (si révision) → output_node
    → END
"""
import uuid

from langgraph.graph import StateGraph, END

from agents.state import AgentState
from agents.nodes.ocr_node import ocr_node
from agents.nodes.orchestrator import orchestrator_node
from agents.nodes.rag_retrieval import rag_retrieval_node
from agents.nodes.rag_requery import rag_requery_node
from agents.nodes.evaluator import evaluator_node
from agents.nodes.output_node import output_node

from agents.specialists.mathematiques import MathematiquesSpecialist
from agents.specialists.francais import FrancaisSpecialist
from agents.specialists.physique_chimie import PhysiqueChimieSpecialist
from agents.specialists.svt import SVTSpecialist
from agents.specialists.histoire_geo import HistoireGeoSpecialist
from agents.specialists.anglais import AnglaisSpecialist
from agents.specialists.philosophie import PhilosophieSpecialist

from config import get_settings

settings = get_settings()

# ── Instanciation des spécialistes (singletons) ────────────────────────────────

_SPECIALISTS = {
    "mathematiques": MathematiquesSpecialist(),
    "francais": FrancaisSpecialist(),
    "physique_chimie": PhysiqueChimieSpecialist(),
    "svt": SVTSpecialist(),
    "histoire_geo": HistoireGeoSpecialist(),
    "anglais": AnglaisSpecialist(),
    "philosophie": PhilosophieSpecialist(),
}


# ── Nodes wrapper pour chaque spécialiste ─────────────────────────────────────

async def _run_specialist(subject: str, state: AgentState) -> dict:
    """Exécute un spécialiste et retourne les mises à jour d'état."""
    specialist = _SPECIALISTS[subject]
    result = await specialist.run(state)

    return {
        "specialist_response": result.response,
        "pending_tool_query": result.pending_tool_query,
        "tool_calls_made": result.tool_calls_made,
    }


async def math_specialist_node(state: AgentState) -> dict:
    return await _run_specialist("mathematiques", state)

async def francais_specialist_node(state: AgentState) -> dict:
    return await _run_specialist("francais", state)

async def physique_chimie_specialist_node(state: AgentState) -> dict:
    return await _run_specialist("physique_chimie", state)

async def svt_specialist_node(state: AgentState) -> dict:
    return await _run_specialist("svt", state)

async def histoire_geo_specialist_node(state: AgentState) -> dict:
    return await _run_specialist("histoire_geo", state)

async def anglais_specialist_node(state: AgentState) -> dict:
    return await _run_specialist("anglais", state)

async def philosophie_specialist_node(state: AgentState) -> dict:
    return await _run_specialist("philosophie", state)


# ── Conditional edges ──────────────────────────────────────────────────────────

def route_to_error_or_continue(state: AgentState) -> str:
    """Après l'OCR : arrêt si erreur, sinon continue."""
    if state.get("error"):
        return "error_end"
    return "orchestrator_node"


def route_by_subject(state: AgentState) -> str:
    """Après l'orchestrateur : route vers le bon spécialiste."""
    subject = state.get("routed_subject", "mathematiques")
    mapping = {
        "mathematiques":  "math_specialist_node",
        "francais":        "francais_specialist_node",
        "physique_chimie": "physique_chimie_specialist_node",
        "svt":             "svt_specialist_node",
        "histoire_geo":    "histoire_geo_specialist_node",
        "anglais":         "anglais_specialist_node",
        "philosophie":     "philosophie_specialist_node",
    }
    return mapping.get(subject, "math_specialist_node")


def after_specialist(state: AgentState) -> str:
    """
    Après un spécialiste :
    - Si l'agent demande plus de contexte ET qu'on n'a pas dépassé la limite → rag_requery
    - Sinon → évaluation
    """
    pending = state.get("pending_tool_query")
    rag_iterations = state.get("rag_iterations", 0)

    if pending and rag_iterations < settings.max_rag_iterations:
        return "rag_requery_node"
    return "evaluator_node"


def after_rag_requery(state: AgentState) -> str:
    """Après une re-query RAG : retour au spécialiste."""
    return route_by_subject(state)


def after_evaluator(state: AgentState) -> str:
    """
    Après l'évaluateur :
    - Si la correction est insuffisante ET qu'on peut encore réviser → spécialiste
    - Sinon → output
    """
    needs_revision = state.get("needs_revision", False)
    revision_count = state.get("revision_count", 0)

    if needs_revision and revision_count < 1:  # max 1 révision
        return route_by_subject(state)
    return "output_node"


# ── Noeud d'erreur ────────────────────────────────────────────────────────────

async def error_end_node(state: AgentState) -> dict:
    """Finalise l'état en cas d'erreur (l'API lira state['error'])."""
    return {
        "final_response": f"Une erreur s'est produite : {state.get('error', 'Erreur inconnue')}",
        "sources_used": [],
    }


# ── Noeud de préparation révision ─────────────────────────────────────────────

async def prepare_revision_node(state: AgentState) -> dict:
    """Incrémente le compteur de révisions avant de relancer le spécialiste."""
    return {"revision_count": state.get("revision_count", 0) + 1}


# ── Construction du graphe ────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    # Noeuds
    graph.add_node("ocr_node", ocr_node)
    graph.add_node("orchestrator_node", orchestrator_node)
    graph.add_node("rag_retrieval_node", rag_retrieval_node)
    graph.add_node("rag_requery_node", rag_requery_node)
    graph.add_node("evaluator_node", evaluator_node)
    graph.add_node("output_node", output_node)
    graph.add_node("error_end", error_end_node)
    graph.add_node("prepare_revision", prepare_revision_node)

    # Noeuds spécialistes
    graph.add_node("math_specialist_node", math_specialist_node)
    graph.add_node("francais_specialist_node", francais_specialist_node)
    graph.add_node("physique_chimie_specialist_node", physique_chimie_specialist_node)
    graph.add_node("svt_specialist_node", svt_specialist_node)
    graph.add_node("histoire_geo_specialist_node", histoire_geo_specialist_node)
    graph.add_node("anglais_specialist_node", anglais_specialist_node)
    graph.add_node("philosophie_specialist_node", philosophie_specialist_node)

    # Edges fixes
    graph.set_entry_point("ocr_node")
    graph.add_edge("orchestrator_node", "rag_retrieval_node")
    graph.add_edge("output_node", END)
    graph.add_edge("error_end", END)
    graph.add_edge("prepare_revision", "rag_retrieval_node")

    # Edges conditionnels
    graph.add_conditional_edges(
        "ocr_node",
        route_to_error_or_continue,
        {"orchestrator_node": "orchestrator_node", "error_end": "error_end"},
    )

    graph.add_conditional_edges(
        "rag_retrieval_node",
        route_by_subject,
        {
            "math_specialist_node": "math_specialist_node",
            "francais_specialist_node": "francais_specialist_node",
            "physique_chimie_specialist_node": "physique_chimie_specialist_node",
            "svt_specialist_node": "svt_specialist_node",
            "histoire_geo_specialist_node": "histoire_geo_specialist_node",
            "anglais_specialist_node": "anglais_specialist_node",
            "philosophie_specialist_node": "philosophie_specialist_node",
        },
    )

    # Chaque spécialiste peut → rag_requery ou → evaluator
    specialist_nodes = [
        "math_specialist_node",
        "francais_specialist_node",
        "physique_chimie_specialist_node",
        "svt_specialist_node",
        "histoire_geo_specialist_node",
        "anglais_specialist_node",
        "philosophie_specialist_node",
    ]
    for node in specialist_nodes:
        graph.add_conditional_edges(
            node,
            after_specialist,
            {"rag_requery_node": "rag_requery_node", "evaluator_node": "evaluator_node"},
        )

    # Après rag_requery → retour au spécialiste
    graph.add_conditional_edges(
        "rag_requery_node",
        after_rag_requery,
        {
            "math_specialist_node": "math_specialist_node",
            "francais_specialist_node": "francais_specialist_node",
            "physique_chimie_specialist_node": "physique_chimie_specialist_node",
            "svt_specialist_node": "svt_specialist_node",
            "histoire_geo_specialist_node": "histoire_geo_specialist_node",
            "anglais_specialist_node": "anglais_specialist_node",
            "philosophie_specialist_node": "philosophie_specialist_node",
        },
    )

    # Après évaluateur → révision ou output
    graph.add_conditional_edges(
        "evaluator_node",
        after_evaluator,
        {
            "math_specialist_node": "prepare_revision",
            "francais_specialist_node": "prepare_revision",
            "physique_chimie_specialist_node": "prepare_revision",
            "svt_specialist_node": "prepare_revision",
            "histoire_geo_specialist_node": "prepare_revision",
            "anglais_specialist_node": "prepare_revision",
            "philosophie_specialist_node": "prepare_revision",
            "output_node": "output_node",
        },
    )

    return graph


# Graphe compilé (singleton)
_compiled_graph = None


def get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph().compile()
    return _compiled_graph


def make_initial_state(
    image_bytes: bytes,
    user_id: str,
    student_answer: str | None = None,
    subject_override: str | None = None,
    stream_enabled: bool = False,
) -> AgentState:
    """Construit l'état initial avant d'entrer dans le graphe."""
    return AgentState(
        user_id=user_id,
        image_bytes=image_bytes,
        student_answer=student_answer,
        subject_override=subject_override,
        stream_enabled=stream_enabled,
        session_id=str(uuid.uuid4()),
        # Champs initialisés à vide / valeurs par défaut
        exercise_statement="",
        detected_subject=None,
        detected_level=None,
        exercise_type="Exercice",
        routed_subject="mathematiques",
        routed_level="3ème",
        rag_query="",
        retrieved_chunks=[],
        rag_iterations=0,
        specialist_response="",
        tool_calls_made=[],
        pending_tool_query=None,
        evaluation_score=0.0,
        evaluation_feedback="",
        needs_revision=False,
        revision_count=0,
        final_response="",
        sources_used=[],
        chunks_found=0,
        specialist_used="",
        error=None,
    )
