"""
Noeud évaluateur — juge la qualité pédagogique de la réponse du spécialiste.
Utilise claude-haiku (moins cher) car la tâche est simple et binaire.
"""
import json

import anthropic

from agents.state import AgentState
from config import get_settings

settings = get_settings()
client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

EVALUATOR_SYSTEM = """Tu es un expert en pédagogie scolaire. Tu évalues la qualité d'une correction d'exercice.

Réponds UNIQUEMENT en JSON valide avec ce format exact :
{
  "score": <float entre 0.0 et 1.0>,
  "needs_revision": <boolean>,
  "feedback": "<feedback concis en 1-2 phrases si révision nécessaire, sinon chaîne vide>"
}

Critères d'évaluation (chacun vaut 0.25 point) :
1. CITATIONS DU COURS : La correction cite-t-elle des passages du cours de l'élève ?
2. ÉTAPES CLAIRES : La correction est-elle structurée en étapes numérotées progressives ?
3. ADAPTATION NIVEAU : Le vocabulaire et la complexité correspondent-ils au niveau scolaire ?
4. PÉDAGOGIE : Explique-t-on le POURQUOI, pas seulement le QUOI ?

Seuil : needs_revision=true si score < 0.75"""


async def evaluator_node(state: AgentState) -> dict:
    """
    Évalue la correction produite par le spécialiste.

    Entrée : specialist_response, exercise_statement, retrieved_chunks, routed_level
    Sortie : evaluation_score, evaluation_feedback, needs_revision
    """
    if state.get("error"):
        return {}

    specialist_response = state.get("specialist_response", "")
    if not specialist_response:
        return {
            "evaluation_score": 0.0,
            "evaluation_feedback": "Aucune réponse du spécialiste.",
            "needs_revision": True,
        }

    # Résumé du contexte pour l'évaluateur (pas besoin de tout l'état)
    chunks_summary = "\n".join(
        f"- {c.get('course_title', '?')} : {c.get('content', '')[:100]}..."
        for c in state.get("retrieved_chunks", [])[:3]
    )

    user_message = f"""NIVEAU SCOLAIRE : {state.get('routed_level', '?')}

ÉNONCÉ DE L'EXERCICE :
{state.get('exercise_statement', '')[:500]}

EXTRAITS DU COURS DISPONIBLES :
{chunks_summary if chunks_summary else "Aucun cours disponible."}

CORRECTION PRODUITE PAR LE SPÉCIALISTE :
{specialist_response[:2000]}

Évalue cette correction selon les 4 critères."""

    try:
        response = client.messages.create(
            model=settings.evaluator_model,
            max_tokens=settings.evaluator_max_tokens,
            system=EVALUATOR_SYSTEM,
            messages=[{"role": "user", "content": user_message}],
        )

        raw = response.content[0].text.strip()

        # Extraction JSON robuste
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        data = json.loads(raw)
        score = float(data.get("score", 0.5))
        needs_revision = bool(data.get("needs_revision", score < 0.75))
        feedback = data.get("feedback", "")

        return {
            "evaluation_score": score,
            "evaluation_feedback": feedback,
            "needs_revision": needs_revision,
        }

    except Exception:
        # En cas d'échec de l'évaluateur : on accepte la réponse telle quelle
        return {
            "evaluation_score": 0.8,
            "evaluation_feedback": "",
            "needs_revision": False,
        }
