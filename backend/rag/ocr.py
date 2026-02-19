"""
OCR module — extrait et structure le texte d'une image de cours via Claude Vision.
"""
import base64
from dataclasses import dataclass

import anthropic

from config import get_settings

settings = get_settings()
client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

COURSE_OCR_PROMPT = """Tu es un assistant spécialisé dans l'extraction de contenu pédagogique.

Analyse cette image de cours (page de manuel, fiche de révision, notes de cours, etc.) et extrais son contenu de manière structurée.

Retourne le contenu sous ce format EXACT :

TITRE: [titre du cours ou de la section, ou "Sans titre" si absent]
MATIERE: [matière détectée : Mathématiques, Physique-Chimie, SVT, Histoire-Géographie, Français, Anglais, Philosophie, etc.]
NIVEAU: [niveau estimé : 6ème, 5ème, 4ème, 3ème, 2nde, 1ère, Terminale, ou "Inconnu"]

CONTENU:
[Retranscris fidèlement TOUT le contenu textuel de l'image.
- Conserve la structure : titres, sous-titres, listes, définitions, formules
- Pour les formules mathématiques, utilise une notation lisible (ex: x^2, sqrt(x), a/b)
- Pour les schémas, décris-les brièvement entre crochets : [Schéma : ...]
- Conserve les exemples et exercices résolus présents dans le cours]

MOTS_CLES: [liste de 5-10 mots-clés séparés par des virgules, concepts importants du cours]"""

EXERCISE_OCR_PROMPT = """Tu es un assistant spécialisé dans l'extraction d'exercices scolaires.

Analyse cette image d'exercice et extrais son contenu de manière précise.

Retourne le contenu sous ce format EXACT :

MATIERE: [matière : Mathématiques, Physique-Chimie, SVT, Histoire-Géographie, Français, Anglais, etc.]
TYPE: [type d'exercice : Problème, QCM, Dissertation, Exercice d'application, Rédaction, etc.]

ENONCE:
[Retranscris l'énoncé COMPLET et fidèle de l'exercice.
- Inclus toutes les données, valeurs numériques, unités
- Inclus toutes les questions (Q1, Q2, etc.)
- Pour les formules, utilise une notation lisible
- Si des figures ou tableaux sont présents, décris-les entre crochets]"""


@dataclass
class CourseOCRResult:
    title: str
    subject: str
    level: str
    content: str
    keywords: list[str]
    raw_text: str


@dataclass
class ExerciseOCRResult:
    subject: str
    exercise_type: str
    statement: str
    raw_text: str


def _image_to_base64(image_bytes: bytes) -> tuple[str, str]:
    """Convertit les bytes d'une image en base64 et détecte le media type."""
    # Détection basique du format par magic bytes
    if image_bytes[:3] == b"\xff\xd8\xff":
        media_type = "image/jpeg"
    elif image_bytes[:8] == b"\x89PNG\r\n\x1a\n":
        media_type = "image/png"
    elif image_bytes[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP":
        media_type = "image/webp"
    else:
        media_type = "image/jpeg"  # fallback

    return base64.standard_b64encode(image_bytes).decode("utf-8"), media_type


def _parse_course_response(text: str) -> CourseOCRResult:
    """Parse la réponse structurée du modèle pour un cours."""
    lines = text.strip().split("\n")
    result = {
        "title": "Sans titre",
        "subject": "Inconnu",
        "level": "Inconnu",
        "content": "",
        "keywords": [],
    }

    content_lines: list[str] = []
    in_content = False

    for line in lines:
        if line.startswith("TITRE:"):
            result["title"] = line.replace("TITRE:", "").strip()
        elif line.startswith("MATIERE:"):
            result["subject"] = line.replace("MATIERE:", "").strip()
        elif line.startswith("NIVEAU:"):
            result["level"] = line.replace("NIVEAU:", "").strip()
        elif line.startswith("MOTS_CLES:"):
            kw_raw = line.replace("MOTS_CLES:", "").strip()
            result["keywords"] = [k.strip() for k in kw_raw.split(",") if k.strip()]
            in_content = False
        elif line.startswith("CONTENU:"):
            in_content = True
        elif in_content:
            content_lines.append(line)

    result["content"] = "\n".join(content_lines).strip()

    return CourseOCRResult(
        title=result["title"],
        subject=result["subject"],
        level=result["level"],
        content=result["content"],
        keywords=result["keywords"],
        raw_text=text,
    )


def _parse_exercise_response(text: str) -> ExerciseOCRResult:
    """Parse la réponse structurée du modèle pour un exercice."""
    lines = text.strip().split("\n")
    result = {
        "subject": "Inconnu",
        "exercise_type": "Exercice",
    }

    statement_lines: list[str] = []
    in_statement = False

    for line in lines:
        if line.startswith("MATIERE:"):
            result["subject"] = line.replace("MATIERE:", "").strip()
        elif line.startswith("TYPE:"):
            result["exercise_type"] = line.replace("TYPE:", "").strip()
        elif line.startswith("ENONCE:"):
            in_statement = True
        elif in_statement:
            statement_lines.append(line)

    statement = "\n".join(statement_lines).strip()

    return ExerciseOCRResult(
        subject=result["subject"],
        exercise_type=result["exercise_type"],
        statement=statement,
        raw_text=text,
    )


async def extract_course_from_image(image_bytes: bytes) -> CourseOCRResult:
    """Extrait le contenu d'une image de cours via Claude Vision."""
    image_data, media_type = _image_to_base64(image_bytes)

    response = client.messages.create(
        model=settings.vision_model,
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_data,
                        },
                    },
                    {"type": "text", "text": COURSE_OCR_PROMPT},
                ],
            }
        ],
    )

    raw_text = response.content[0].text
    return _parse_course_response(raw_text)


async def extract_exercise_from_image(image_bytes: bytes) -> ExerciseOCRResult:
    """Extrait l'énoncé d'une image d'exercice via Claude Vision."""
    image_data, media_type = _image_to_base64(image_bytes)

    response = client.messages.create(
        model=settings.vision_model,
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_data,
                        },
                    },
                    {"type": "text", "text": EXERCISE_OCR_PROMPT},
                ],
            }
        ],
    )

    raw_text = response.content[0].text
    return _parse_exercise_response(raw_text)
