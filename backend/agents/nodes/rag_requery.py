"""
Noeud RAG re-query — affine la recherche quand un spécialiste demande plus de contexte.
Fusionne les nouveaux chunks avec les précédents (dédupliqués).
"""
from agents.state import AgentState
from rag.retrieval import search_relevant_chunks
from config import get_settings

settings = get_settings()


async def rag_requery_node(state: AgentState) -> dict:
    """
    Déclenché quand pending_tool_query est défini par un spécialiste.
    Effectue une nouvelle recherche et fusionne avec les chunks existants.

    Entrée : pending_tool_query, user_id, routed_subject, retrieved_chunks, rag_iterations
    Sortie : retrieved_chunks (fusionnés), rag_iterations (incrémenté), pending_tool_query (reset)
    """
    new_query = state.get("pending_tool_query", "")
    if not new_query:
        return {"pending_tool_query": None}

    try:
        new_chunks = await search_relevant_chunks(
            query=new_query,
            user_id=state["user_id"],
            subject=state.get("routed_subject"),
            top_k=settings.specialist_top_k,
        )

        new_chunks_dicts = [
            {
                "content": c.content,
                "course_title": c.course_title,
                "subject": c.subject,
                "similarity": c.similarity,
                "chunk_index": c.chunk_index,
                "course_id": c.course_id,
            }
            for c in new_chunks
        ]

        # Fusion et déduplication par (course_id, chunk_index)
        existing = state.get("retrieved_chunks", [])
        seen = {
            (c["course_id"], c["chunk_index"])
            for c in existing
        }

        merged = list(existing)
        for chunk in new_chunks_dicts:
            key = (chunk["course_id"], chunk["chunk_index"])
            if key not in seen:
                merged.append(chunk)
                seen.add(key)

        # Trier par similarité décroissante et garder les top_k * 2
        merged.sort(key=lambda c: c["similarity"], reverse=True)
        merged = merged[: settings.specialist_top_k * 2]

        return {
            "retrieved_chunks": merged,
            "chunks_found": len(merged),
            "rag_iterations": state.get("rag_iterations", 0) + 1,
            "pending_tool_query": None,
            "rag_query": new_query,
        }

    except Exception:
        return {
            "pending_tool_query": None,
            "rag_iterations": state.get("rag_iterations", 0) + 1,
        }
