"""
Agent spécialiste Français.
Approche : lecture active, justification par le texte, structure rhétorique explicite.
"""
from agents.specialists.base_specialist import BaseSpecialist
from agents.state import SubjectType

TEXT_EXTRACTOR_TOOL = {
    "name": "text_extractor",
    "description": (
        "Recherche une règle grammaticale, une définition littéraire ou un exemple "
        "spécifique dans le cours de l'élève."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "concept": {
                "type": "string",
                "description": "Concept littéraire ou grammatical recherché (ex: 'métaphore', 'accord du participe passé')",
            },
            "context": {
                "type": "string",
                "description": "Contexte de l'exercice",
            },
        },
        "required": ["concept"],
    },
}


class FrancaisSpecialist(BaseSpecialist):
    subject: SubjectType = "francais"

    @property
    def subject_instructions(self) -> str:
        return """
APPROCHE FRANÇAIS :
- Toujours partir du texte/de l'énoncé — ne jamais paraphraser, toujours analyser
- Citer le texte étudié entre guillemets avant toute interprétation
- Distinguer clairement : GRAMMAIRE vs LECTURE / ANALYSE DE TEXTE vs EXPRESSION ÉCRITE

POUR LA GRAMMAIRE :
- Énoncer la règle générale tirée du cours avant de l'appliquer
- Montrer l'analyse grammaticale (nature → fonction → accord)
- Donner un contre-exemple pour ancrer la règle

POUR L'ANALYSE DE TEXTE (commentaire, explication) :
- Dégager la thèse/idée centrale en 1 phrase avant d'analyser
- Procéder du plus évident vers le plus subtil
- Chaque observation = citation + commentaire + interprétation
- Jamais d'interprétation sans citation, jamais de citation sans commentaire

POUR LA DISSERTATION / ARGUMENTATION :
- Formuler la problématique explicitement avant tout développement
- Structure Thèse / Antithèse / Synthèse clairement nommée
- Chaque argument = affirmation + exemple + explication du lien

POUR LA RÉDACTION / EXPRESSION ÉCRITE :
- Vérifier d'abord le sujet (type de texte demandé, contraintes)
- Proposer un plan avant la rédaction
- Corriger en priorité : orthographe grammaticale > syntaxe > style

FORMAT SPÉCIFIQUE FRANÇAIS :
- Pour les textes : "Ligne X : [citation]" pour les références
- Pour la grammaire : [Mot] → nature : ... → fonction : ... → accord : ...
- Pour les dissertations : afficher le plan en 3 points avant le développement
"""

    @property
    def subject_tools(self) -> list[dict]:
        return [TEXT_EXTRACTOR_TOOL]
