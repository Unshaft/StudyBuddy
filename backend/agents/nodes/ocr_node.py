"""
Noeud OCR — extrait l'énoncé de l'exercice depuis l'image.
Wrapper du module rag.ocr existant.
"""
from agents.state import AgentState, normalize_subject
from rag.ocr import extract_exercise_from_image


async def ocr_node(state: AgentState) -> dict:
    """
    Entrée : state["image_bytes"]
    Sortie : exercise_statement, detected_subject, detected_level, exercise_type
    """
    try:
        result = await extract_exercise_from_image(state["image_bytes"])

        if not result.statement:
            return {"error": "OCR_FAILED: Impossible d'extraire l'énoncé de l'image."}

        return {
            "exercise_statement": result.statement,
            "detected_subject": result.subject,
            "detected_level": None,   # L'OCR exercice ne détecte pas le niveau — l'orchestrateur gère
            "exercise_type": result.exercise_type,
            "error": None,
        }

    except Exception as e:
        return {"error": f"OCR_ERROR: {str(e)}"}
