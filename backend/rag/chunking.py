"""
Chunking module — découpe le texte d'un cours en chunks adaptés au RAG.

Stratégie :
- Priorité au découpage par blocs sémantiques (titres, paragraphes)
- Respect d'une taille max en tokens approx. (chunk_size en caractères)
- Overlap pour conserver le contexte entre chunks
"""
from dataclasses import dataclass

from config import get_settings

settings = get_settings()


@dataclass
class TextChunk:
    content: str
    chunk_index: int
    metadata: dict


def _split_by_paragraphs(text: str) -> list[str]:
    """Divise le texte en blocs naturels (double saut de ligne ou titres)."""
    import re

    # Découpe sur les lignes vides ou les changements de section
    blocks = re.split(r"\n{2,}|(?=\n#{1,3}\s)", text)
    return [b.strip() for b in blocks if b.strip()]


def _merge_short_blocks(blocks: list[str], min_size: int = 200) -> list[str]:
    """Fusionne les blocs trop courts avec leur voisin."""
    merged: list[str] = []
    buffer = ""

    for block in blocks:
        if len(buffer) + len(block) < min_size:
            buffer = (buffer + "\n\n" + block).strip() if buffer else block
        else:
            if buffer:
                merged.append(buffer)
            buffer = block

    if buffer:
        merged.append(buffer)

    return merged


def _split_long_block(block: str, chunk_size: int, overlap: int) -> list[str]:
    """Découpe un bloc trop long en sous-chunks avec overlap."""
    chunks: list[str] = []
    start = 0

    while start < len(block):
        end = start + chunk_size

        if end >= len(block):
            chunks.append(block[start:].strip())
            break

        # Cherche une coupure propre (fin de phrase ou fin de ligne)
        cut = block.rfind("\n", start, end)
        if cut == -1:
            cut = block.rfind(". ", start, end)
        if cut == -1:
            cut = end

        chunks.append(block[start:cut].strip())
        start = max(start + 1, cut - overlap)

    return [c for c in chunks if c]


def chunk_course_text(
    text: str,
    course_id: str,
    subject: str,
    title: str,
    keywords: list[str],
    chunk_size: int | None = None,
    overlap: int | None = None,
) -> list[TextChunk]:
    """
    Transforme le texte d'un cours en liste de chunks prêts à être vectorisés.

    Args:
        text: Contenu textuel extrait du cours (depuis OCR)
        course_id: ID du cours dans la DB
        subject: Matière du cours
        title: Titre du cours
        keywords: Mots-clés du cours
        chunk_size: Taille max d'un chunk en caractères
        overlap: Overlap entre chunks

    Returns:
        Liste de TextChunk avec contenu et métadonnées
    """
    _chunk_size = chunk_size or settings.chunk_size
    _overlap = overlap or settings.chunk_overlap

    # 1. Découpe en blocs naturels
    blocks = _split_by_paragraphs(text)

    # 2. Fusion des blocs trop courts
    blocks = _merge_short_blocks(blocks, min_size=150)

    # 3. Découpe des blocs trop longs
    final_chunks: list[str] = []
    for block in blocks:
        if len(block) <= _chunk_size:
            final_chunks.append(block)
        else:
            final_chunks.extend(_split_long_block(block, _chunk_size, _overlap))

    # 4. Construction des TextChunk avec métadonnées
    chunks: list[TextChunk] = []
    for i, content in enumerate(final_chunks):
        # Le contenu envoyé à l'embedding inclut le contexte du cours
        enriched_content = f"[{subject} — {title}]\n{content}"

        chunks.append(
            TextChunk(
                content=enriched_content,
                chunk_index=i,
                metadata={
                    "course_id": course_id,
                    "subject": subject,
                    "title": title,
                    "keywords": keywords,
                    "chunk_index": i,
                    "total_chunks": len(final_chunks),
                },
            )
        )

    return chunks
