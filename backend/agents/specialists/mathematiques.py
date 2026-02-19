"""
Agent spécialiste Mathématiques.
Approche : décomposition algorithmique stricte, notation LaTeX-light, vérification des unités.
"""
from agents.specialists.base_specialist import BaseSpecialist, RAG_REQUERY_TOOL
from agents.state import SubjectType

FORMULA_CHECKER_TOOL = {
    "name": "formula_checker",
    "description": (
        "Recherche une formule ou un théorème spécifique dans le cours de l'élève. "
        "À utiliser avant d'appliquer une formule pour vérifier qu'elle est bien dans le cours."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "formula_name": {
                "type": "string",
                "description": "Nom du théorème ou de la formule (ex: 'théorème de Pythagore', 'formule quadratique')",
            },
            "context": {
                "type": "string",
                "description": "Contexte mathématique de l'exercice",
            },
        },
        "required": ["formula_name"],
    },
}


class MathematiquesSpecialist(BaseSpecialist):
    subject: SubjectType = "mathematiques"

    @property
    def subject_instructions(self) -> str:
        return """
APPROCHE MATHÉMATIQUE :
- Décomposition algorithmique STRICTE : une opération = une étape. Ne jamais sauter d'étape.
- Avant d'appliquer une formule, la citer depuis le cours : *"D'après le cours : [formule]"*
- Notation : utilise une notation lisible (a^2, sqrt(x), a/b, pi) — pas de LaTeX complet
- Vérification systématique : à chaque calcul numérique, vérifie l'unité et l'ordre de grandeur
- Ne jamais donner le résultat final avant d'avoir fait tous les calculs intermédiaires
- Pour les géométrie : décrire les figures avec des mots avant de calculer
- Pour les probabilités : expliciter l'espace des possibles avant de calculer
- Pour l'algèbre : montrer toutes les étapes de manipulation (distribution, factorisation, etc.)

FORMAT SPÉCIFIQUE MATHS :
- Données : liste les données connues en début d'exercice
- Inconnue : identifie ce qu'on cherche
- Méthode : nomme la méthode choisie (ex: "Je vais utiliser la méthode de substitution")
- Calcul : montre chaque opération sur une ligne dédiée
- Vérification : vérifie le résultat (en remplaçant, en estimant l'ordre de grandeur)
- Conclusion : réponds à la question posée avec l'unité correcte

PIÈGES À ÉVITER :
- Ne jamais simplifier une fraction sans montrer l'étape de simplification
- Ne jamais passer d'une équation à sa solution sans montrer les manipulations
- Ne jamais oublier les unités dans les problèmes concrets
"""

    @property
    def subject_tools(self) -> list[dict]:
        return [FORMULA_CHECKER_TOOL]
