"""
Embeddings module — génère les vecteurs via Voyage AI (voyage-3, 1024 dims).
Partenaire officiel Anthropic. Gratuit jusqu'à 200M tokens/mois.
"""
import voyageai

from config import get_settings
from rag.chunking import TextChunk

settings = get_settings()
client = voyageai.AsyncClient(api_key=settings.voyage_api_key)


async def embed_text(text: str) -> list[float]:
    """Génère l'embedding d'un texte unique (document)."""
    result = await client.embed([text], model=settings.embedding_model, input_type="document")
    return result.embeddings[0]


async def embed_chunks(chunks: list[TextChunk]) -> list[tuple[TextChunk, list[float]]]:
    """
    Génère les embeddings pour une liste de chunks.
    Voyage AI supporte jusqu'à 128 inputs par batch.

    Returns:
        Liste de tuples (chunk, embedding)
    """
    BATCH_SIZE = 128

    results: list[tuple[TextChunk, list[float]]] = []

    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        texts = [chunk.content for chunk in batch]

        result = await client.embed(texts, model=settings.embedding_model, input_type="document")

        for chunk, embedding in zip(batch, result.embeddings):
            results.append((chunk, embedding))

    return results


async def embed_query(query: str) -> list[float]:
    """
    Génère l'embedding d'une requête de recherche.
    input_type="query" optimise pour la recherche asymétrique (différent de "document").
    """
    result = await client.embed([query], model=settings.embedding_model, input_type="query")
    return result.embeddings[0]
