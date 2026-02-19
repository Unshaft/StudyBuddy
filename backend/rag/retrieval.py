"""
Retrieval module — recherche vectorielle dans pgvector via Supabase.
"""
from dataclasses import dataclass

from db.client import get_supabase
from rag.embeddings import embed_query
from config import get_settings

settings = get_settings()


@dataclass
class RetrievedChunk:
    content: str
    course_title: str
    subject: str
    similarity: float
    chunk_index: int
    course_id: str


async def store_chunks(
    chunks_with_embeddings: list[tuple],
    user_id: str,
    course_id: str,
) -> None:
    """
    Stocke les chunks et leurs embeddings dans Supabase/pgvector.

    Args:
        chunks_with_embeddings: Liste de (TextChunk, embedding)
        user_id: ID de l'utilisateur
        course_id: ID du cours
    """
    supabase = get_supabase()

    rows = []
    for chunk, embedding in chunks_with_embeddings:
        rows.append(
            {
                "course_id": course_id,
                "user_id": user_id,
                "content": chunk.content,
                "embedding": embedding,
                "chunk_index": chunk.chunk_index,
                "metadata": chunk.metadata,
            }
        )

    # Insertion par batch
    BATCH_SIZE = 50
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        supabase.table("course_chunks").insert(batch).execute()


async def search_relevant_chunks(
    query: str,
    user_id: str,
    subject: str | None = None,
    top_k: int | None = None,
) -> list[RetrievedChunk]:
    """
    Recherche les chunks les plus pertinents pour une requête.

    Args:
        query: Texte de la requête (énoncé de l'exercice)
        user_id: ID de l'utilisateur (on cherche uniquement dans ses cours)
        subject: Filtre optionnel par matière
        top_k: Nombre de résultats à retourner

    Returns:
        Liste de chunks triés par similarité décroissante
    """
    _top_k = top_k or settings.retrieval_top_k

    # Embed la requête
    query_embedding = await embed_query(query)

    supabase = get_supabase()

    # Appel à la fonction RPC pgvector définie dans la migration SQL
    params = {
        "query_embedding": query_embedding,
        "user_id_filter": user_id,
        "match_count": _top_k,
    }
    if subject:
        params["subject_filter"] = subject

    result = supabase.rpc("search_course_chunks", params).execute()

    chunks: list[RetrievedChunk] = []
    for row in result.data:
        chunks.append(
            RetrievedChunk(
                content=row["content"],
                course_title=row["course_title"],
                subject=row["subject"],
                similarity=row["similarity"],
                chunk_index=row["chunk_index"],
                course_id=row["course_id"],
            )
        )

    return chunks


async def delete_course_chunks(course_id: str) -> None:
    """Supprime tous les chunks d'un cours (lors de la suppression du cours)."""
    supabase = get_supabase()
    supabase.table("course_chunks").delete().eq("course_id", course_id).execute()
