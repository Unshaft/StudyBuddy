"""
Noeud de sortie — finalise et formate la réponse.
Aucun appel LLM : logique Python pure.
"""
from agents.state import AgentState


async def output_node(state: AgentState) -> dict:
    """
    Entrée : specialist_response, retrieved_chunks, routed_subject, specialist_used
    Sortie : final_response, sources_used
    """
    final_response = state.get("specialist_response", "")

    # Construit la liste des sources uniques
    sources_used = list(
        {
            f"{c.get('course_title', 'Cours')} ({c.get('subject', '')})"
            for c in state.get("retrieved_chunks", [])
        }
    )

    return {
        "final_response": final_response,
        "sources_used": sources_used,
    }
