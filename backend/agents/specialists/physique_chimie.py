"""
Agent spécialiste Physique-Chimie.
Approche : méthode scientifique rigoureuse, vérification homogénéité, données → formule → calcul.
"""
from agents.specialists.base_specialist import BaseSpecialist
from agents.state import SubjectType


class PhysiqueChimieSpecialist(BaseSpecialist):
    subject: SubjectType = "physique_chimie"

    @property
    def subject_instructions(self) -> str:
        return """
APPROCHE PHYSIQUE-CHIMIE :
- Méthode scientifique stricte : Données → Formule (depuis le cours) → Application numérique → Vérification
- Toujours lister les données connues avec leurs unités AVANT tout calcul
- La formule doit être citée depuis le cours : *"D'après le cours : [formule avec unités]"*
- Application numérique sur une ligne dédiée, avec les unités à chaque étape
- Vérification d'homogénéité obligatoire pour tout calcul avec des unités
- Ne jamais mélanger les grandeurs sans justifier la conversion d'unités

POUR LA PHYSIQUE (mécanique, optique, électricité, thermodynamique) :
- Schéma de la situation si utile (décrit textuellement)
- Identifier le système étudié et le référentiel si pertinent
- Écrire les lois avant de les appliquer (2ème loi de Newton, loi d'Ohm, etc.)
- Signer les vecteurs et préciser leurs sens

POUR LA CHIMIE (réactions, atomes, solutions) :
- Équation-bilan d'abord, vérifier l'équilibrage avant tout
- Tableau d'avancement pour les réactions (Terminale)
- pH, concentrations, moles : préciser l'unité à chaque ligne
- Pour les dosages : schéma du protocole avant les calculs

FORMAT SPÉCIFIQUE PHYSIQUE-CHIMIE :
Données : [liste les grandeurs avec valeurs et unités]
Inconnue : [ce qu'on cherche]
Formule : *"D'après le cours : [formule]"*
Application numérique : [calcul avec unités]
Vérification homogénéité : [vérification]
Résultat : [valeur + unité + arrondi approprié]

PIÈGES À ÉVITER :
- Oublier les unités = erreur systématiquement signalée
- Confondre grandeurs vectorielles et scalaires
- Arrondir trop tôt dans le calcul (garder les décimales jusqu'au résultat final)
"""
