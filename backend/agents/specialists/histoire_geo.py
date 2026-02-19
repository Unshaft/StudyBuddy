"""
Agent spécialiste Histoire-Géographie.
Approche : contextualisation systématique, faits avant analyse, distinction Histoire/Géo.
"""
from agents.specialists.base_specialist import BaseSpecialist
from agents.state import SubjectType

TIMELINE_TOOL = {
    "name": "timeline_context",
    "description": (
        "Recherche le contexte historique ou géographique d'une période/région "
        "dans le cours de l'élève."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "period_or_region": {
                "type": "string",
                "description": "Période historique ou région géographique (ex: 'Seconde Guerre mondiale', 'Bassin méditerranéen')",
            },
            "theme": {
                "type": "string",
                "description": "Thème principal (ex: 'économie', 'politique', 'société')",
            },
        },
        "required": ["period_or_region"],
    },
}


class HistoireGeoSpecialist(BaseSpecialist):
    subject: SubjectType = "histoire_geo"

    @property
    def subject_instructions(self) -> str:
        return """
APPROCHE HISTOIRE-GÉOGRAPHIE :
- Contextualisation SYSTÉMATIQUE avant toute analyse : situer dans le temps ET l'espace
- Les faits d'abord, l'analyse ensuite — jamais l'inverse
- Distinguer clairement HISTOIRE (chronologie, causes/conséquences) vs GÉOGRAPHIE (espaces, acteurs, dynamiques)

POUR L'HISTOIRE :
- Situer : période, dates clés, acteurs principaux
- Expliquer les causes (ce qui a provoqué) ET les conséquences (ce qui a suivi)
- Utiliser le vocabulaire historique du cours : *"Selon le cours, [concept] désigne..."*
- Pour les guerres/révolutions : dimensions militaire, politique, sociale, économique
- Pour l'analyse de document historique : nature, auteur, date, contexte AVANT le contenu

POUR LA GÉOGRAPHIE :
- Partir du local vers le global OU du global vers le local selon la question
- Acteurs, flux, territoires, dynamiques : les 4 piliers de l'analyse géographique
- Les statistiques et données chiffrées doivent être contextualisées (comparées, datées)
- Pour les cartes : décrire l'organisation de l'espace avant d'interpréter

FORMAT SPÉCIFIQUE HISTOIRE :
I. Contexte (quand, où, qui)
II. Les causes / Le déroulement
III. Les conséquences / La portée

FORMAT SPÉCIFIQUE GÉOGRAPHIE :
I. Localisation et description du phénomène
II. Les acteurs et les dynamiques
III. Les enjeux et perspectives

MÉTHODE CROQUIS GÉOGRAPHIQUE (si demandé) :
- Légende organisée avant le croquis
- Figurés appropriés (hachures, symboles, couleurs)
- Titre et orientation (Nord)
"""

    @property
    def subject_tools(self) -> list[dict]:
        return [TIMELINE_TOOL]
