"""
Agent correcteur — corrige un exercice pas-à-pas en s'appuyant sur le cours de l'élève.

Utilise Claude avec un contexte RAG injecté dans le system prompt.
Génère une réponse structurée avec des étapes numérotées et des citations de cours.
"""
from dataclasses import dataclass
from typing import AsyncIterator

import anthropic

from config import get_settings
from rag.retrieval import RetrievedChunk

settings = get_settings()
client = anthropic.Anthropic(api_key=settings.anthropic_api_key)


CORRECTOR_SYSTEM_PROMPT = """Tu es StudyBuddy, un professeur particulier bienveillant et pédagogue.

Tu aides un élève à comprendre et corriger un exercice en utilisant UNIQUEMENT les notions de son propre cours.

RÈGLES IMPORTANTES :
1. Corrige l'exercice étape par étape, de manière progressive
2. À chaque étape, cite explicitement le passage du cours qui justifie ta démarche (entre guillemets)
3. Explique le POURQUOI, pas seulement le QUOI — l'élève doit comprendre
4. Si une notion du cours manque pour résoudre l'exercice, dis-le clairement
5. Adapte ton niveau de langage au niveau scolaire de l'élève
6. Sois encourageant — valorise la démarche avant de corriger les erreurs
7. À la fin, fais un résumé des points clés à retenir

FORMAT DE RÉPONSE :
- Commence par analyser l'exercice en une phrase
- Numéroter chaque étape clairement : "Étape 1 :", "Étape 2 :", etc.
- Cite le cours entre guillemets et en italique : *"[citation du cours]"*
- Termine par "À retenir :" avec les points essentiels

CONTEXTE DU COURS DE L'ÉLÈVE :
{course_context}"""

NO_COURSE_CONTEXT = """⚠️ Aucun cours correspondant n'a été trouvé dans ta bibliothèque pour cette matière.
Je vais quand même t'aider, mais je t'encourage à d'abord ajouter ton cours pour une aide personnalisée."""


@dataclass
class CorrectionStep:
    step_number: int
    title: str
    explanation: str
    course_reference: str | None


@dataclass
class CorrectionResult:
    exercise_summary: str
    steps: list[CorrectionStep]
    key_takeaways: list[str]
    sources_used: list[str]
    full_response: str


def _build_course_context(chunks: list[RetrievedChunk]) -> str:
    """Construit le contexte cours à injecter dans le prompt."""
    if not chunks:
        return NO_COURSE_CONTEXT

    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        context_parts.append(
            f"[Extrait {i} — {chunk.course_title} ({chunk.subject}), "
            f"pertinence: {chunk.similarity:.0%}]\n{chunk.content}"
        )

    return "\n\n---\n\n".join(context_parts)


def _build_correction_prompt(
    exercise_statement: str,
    student_answer: str | None = None,
) -> str:
    """Construit le prompt utilisateur avec l'énoncé et la réponse de l'élève."""
    prompt = f"**ÉNONCÉ DE L'EXERCICE :**\n{exercise_statement}"

    if student_answer:
        prompt += f"\n\n**MA RÉPONSE (à corriger) :**\n{student_answer}"
    else:
        prompt += "\n\n*L'élève n'a pas encore répondu — guide-le pas-à-pas.*"

    return prompt


async def correct_exercise(
    exercise_statement: str,
    retrieved_chunks: list[RetrievedChunk],
    student_answer: str | None = None,
) -> CorrectionResult:
    """
    Corrige un exercice en utilisant le contexte RAG du cours de l'élève.

    Args:
        exercise_statement: L'énoncé de l'exercice (extrait par OCR)
        retrieved_chunks: Chunks pertinents du cours récupérés par le RAG
        student_answer: Réponse de l'élève (optionnel — mode correction vs mode guidage)

    Returns:
        CorrectionResult avec la correction structurée
    """
    course_context = _build_course_context(retrieved_chunks)
    system_prompt = CORRECTOR_SYSTEM_PROMPT.format(course_context=course_context)
    user_prompt = _build_correction_prompt(exercise_statement, student_answer)

    response = client.messages.create(
        model=settings.correction_model,
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )

    full_response = response.content[0].text

    # Sources utilisées (cours référencés)
    sources_used = list(
        {f"{c.course_title} ({c.subject})" for c in retrieved_chunks}
    )

    return CorrectionResult(
        exercise_summary="",
        steps=[],
        key_takeaways=[],
        sources_used=sources_used,
        full_response=full_response,
    )


async def correct_exercise_stream(
    exercise_statement: str,
    retrieved_chunks: list[RetrievedChunk],
    student_answer: str | None = None,
) -> AsyncIterator[str]:
    """
    Version streaming de la correction — pour un affichage progressif côté frontend.
    Génère les tokens au fur et à mesure.
    """
    course_context = _build_course_context(retrieved_chunks)
    system_prompt = CORRECTOR_SYSTEM_PROMPT.format(course_context=course_context)
    user_prompt = _build_correction_prompt(exercise_statement, student_answer)

    with client.messages.stream(
        model=settings.correction_model,
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    ) as stream:
        for text in stream.text_stream:
            yield text
