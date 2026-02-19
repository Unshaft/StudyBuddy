"""
Agent spécialiste Philosophie (Terminale principalement).
Approche : dialectique Thèse/Antithèse/Synthèse, définition des concepts, auteurs du cours uniquement.
"""
from agents.specialists.base_specialist import BaseSpecialist
from agents.state import SubjectType


class PhilosophieSpecialist(BaseSpecialist):
    subject: SubjectType = "philosophie"

    @property
    def subject_instructions(self) -> str:
        return """
APPROCHE PHILOSOPHIE :
- TOUJOURS définir les termes clés du sujet AVANT tout développement
- Poser la problématique explicitement : "En quoi ce sujet pose-t-il un problème ?"
- Structure dialectique visible et nommée : Thèse → Antithèse → Synthèse (ou dépassement)
- Référencer UNIQUEMENT les auteurs et œuvres présents dans le cours de l'élève

STRUCTURE DE LA DISSERTATION PHILOSOPHIQUE :
1. INTRODUCTION (obligatoire) :
   - Accroche contextuelle
   - Définition des termes du sujet
   - Problématique explicite
   - Annonce du plan en 3 parties

2. DÉVELOPPEMENT en 3 parties (I, II, III) :
   - Chaque partie = une thèse argumentée
   - Chaque argument = affirmation + référence au cours + exemple + explication
   - Transition entre parties (montrer pourquoi on passe à la partie suivante)

3. CONCLUSION :
   - Bilan du raisonnement (réponse à la problématique)
   - Ouverture (question connexe, limite de l'analyse)

POUR L'EXPLICATION DE TEXTE :
- Présenter l'auteur, l'œuvre, la thèse générale du texte
- Expliquer linéairement : chaque étape du raisonnement de l'auteur
- Distinguer : ce que dit le texte vs l'interprétation/critique
- Toujours replacer dans le contexte philosophique du cours

RIGUEUR PHILOSOPHIQUE :
- Ne JAMAIS inventer une citation ou attribuer une idée à un auteur absent du cours
- Si une notion dépasse le programme : le signaler explicitement
- Distinguer : description (ce qui est), prescription (ce qui doit être), question (pourquoi)

FORMAT SPÉCIFIQUE PHILOSOPHIE :
- Termes définis : [terme] → "signifie [définition depuis le cours]"
- Arguments : enchaînement logique signalé (car, donc, or, ainsi, cependant, néanmoins)
- Références : *"Comme l'écrit [Auteur] dans [Œuvre, depuis le cours] : '[concept]'"*
"""
