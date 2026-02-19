"""
Noeud RAG retrieval — recherche les chunks pertinents dans pgvector.
Wrapper de rag.retrieval existant.
"""
from agents.state import AgentState
from rag.retrieval import search_relevant_chunks
from config import get_settings

settings = get_settings()


async def rag_retrieval_node(state: AgentState) -> dict:
    """
    Entrée : rag_query, user_id, routed_subject
    Sortie : retrieved_chunks (list[dict]), chunks_found
    """
    if state.get("error"):
        return {}

    try:
        chunks = await search_relevant_chunks(
            query=state["rag_query"],
            user_id=state["user_id"],
            subject=state.get("routed_subject"),
            top_k=settings.specialist_top_k,
        )

        # Sérialise les RetrievedChunk en dicts pour l'état LangGraph
        chunks_dicts = [
            {
                "content": c.content,
                "course_title": c.course_title,
                "subject": c.subject,
                "similarity": c.similarity,
                "chunk_index": c.chunk_index,
                "course_id": c.course_id,
            }
            for c in chunks
        ]

        return {
            "retrieved_chunks": chunks_dicts,
            "chunks_found": len(chunks_dicts),
        }

    except Exception as e:
        # Le RAG peut échouer si la DB est vide — on continue sans contexte
        return {
            "retrieved_chunks": [],
            "chunks_found": 0,
        }
