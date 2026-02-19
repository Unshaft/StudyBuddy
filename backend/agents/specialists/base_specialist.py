"""
BaseSpecialist — classe abstraite partagée par tous les agents spécialistes.

Contient :
- La logique d'adaptation pédagogique par niveau (get_level_instructions)
- La construction du system prompt (build_system_prompt)
- La boucle de tool use Anthropic (run_with_tools)
- Le contrat abstrait que chaque spécialiste doit implémenter
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass

import anthropic

from agents.state import AgentState, SchoolLevel, SubjectType
from config import get_settings

settings = get_settings()
client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
async_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

# ── Persona StudyBuddy commune ────────────────────────────────────────────────

BASE_STUDYBUDDY_PERSONA = """Tu es StudyBuddy, un professeur particulier expert et bienveillant.
Ta mission : aider un élève à comprendre et résoudre un exercice en t'appuyant EXCLUSIVEMENT sur son cours.

RÈGLES FONDAMENTALES :
1. Ne jamais inventer une notion absente du cours fourni — si elle manque, dis-le clairement
2. Citer le cours à chaque justification : *"[citation exacte du cours]"*
3. Corriger étape par étape — ne jamais donner le résultat final d'emblée
4. Être encourageant : valoriser la démarche avant de corriger les erreurs
5. Adapter ton vocabulaire et ta complexité au niveau scolaire de l'élève"""

# ── Instructions pédagogiques par niveau ──────────────────────────────────────

LEVEL_INSTRUCTIONS: dict[str, str] = {
    "6ème": """
ADAPTATION 6ÈME :
- Phrases très courtes (max 15 mots). Vocabulaire du quotidien uniquement.
- Chaque terme technique est immédiatement expliqué avec une analogie concrète ("c'est comme si...")
- Une seule idée par étape — jamais deux actions dans la même phrase
- Commencer par encourager : "Bonne question !", "Tu as bien commencé quand..."
- Pas d'abréviations, pas de voix passive, pas de conditionnel complexe
- Longueur cible : 300-400 mots maximum
""",
    "5ème": """
ADAPTATION 5ÈME :
- Phrases courtes. Vocabulaire simple avec explications des termes disciplinaires.
- Analogies concrètes bienvenues. Étapes très granulaires.
- Encouragement en ouverture, correction bienveillante.
- Longueur cible : 350-450 mots
""",
    "4ème": """
ADAPTATION 4ÈME :
- Introduction progressive du vocabulaire disciplinaire (défini à sa première apparition).
- Les étapes peuvent être regroupées si logiquement liées.
- Début des références méthodologiques : "Comme vu en cours, la méthode consiste à..."
- Longueur cible : 400-600 mots
""",
    "3ème": """
ADAPTATION 3ÈME :
- Vocabulaire disciplinaire assumé mais défini si nouveau ou complexe.
- Méthode explicitement nommée. Lien avec le brevet mentionné si pertinent.
- Étapes claires et numérotées. Synthèse en fin de correction.
- Longueur cible : 450-700 mots
""",
    "2nde": """
ADAPTATION 2NDE :
- Vocabulaire technique pleinement assumé.
- Méthodes formalisées et nommées (ex : "Méthode de la résolution d'équation du 2nd degré").
- Rigueur formelle croissante : les raisonnements sont explicitement justifiés.
- Longueur cible : 500-750 mots
""",
    "1ère": """
ADAPTATION 1ÈRE :
- Raisonnement rigoureux, structure de copie visible (intro / développement / conclusion si pertinent).
- Capacité à questionner l'élève en fin de réponse : "Que penses-tu de ce résultat ? Vérifie-le..."
- Pour les spécialités : structure attendue à l'examen explicitée.
- Longueur cible : 600-900 mots
""",
    "Terminale": """
ADAPTATION TERMINALE :
- Rigueur formelle complète — le raisonnement doit être irréprochable.
- Structure de copie d'examen explicite : introduction avec problématique, développement structuré, conclusion.
- Signaler explicitement si une notion dépasse le programme du BAC.
- Critères d'évaluation mentionnés si pertinents pour l'exercice.
- Longueur cible : 700-1000 mots
""",
}

# ── Outil universel : rag_requery ─────────────────────────────────────────────

RAG_REQUERY_TOOL = {
    "name": "rag_requery",
    "description": (
        "Affine la recherche dans le cours de l'élève avec une requête plus précise. "
        "À utiliser quand les extraits de cours fournis ne couvrent pas le concept "
        "nécessaire pour résoudre l'exercice."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "new_query": {
                "type": "string",
                "description": "Nouvelle requête de recherche plus ciblée",
            },
            "focus_concept": {
                "type": "string",
                "description": "Concept précis recherché (ex: 'théorème de Pythagore')",
            },
            "reason": {
                "type": "string",
                "description": "Pourquoi la requête initiale était insuffisante",
            },
        },
        "required": ["new_query", "focus_concept"],
    },
}


@dataclass
class SpecialistResult:
    response: str
    pending_tool_query: str | None  # Non-None si l'agent veut re-querier le RAG
    tool_calls_made: list[str]


class BaseSpecialist(ABC):
    """
    Classe abstraite pour tous les agents spécialistes.
    Chaque spécialiste hérite de cette classe et implémente :
      - subject : le SubjectType correspondant
      - subject_instructions : les instructions pédagogiques propres à la matière
      - subject_tools (optionnel) : outils supplémentaires spécifiques à la matière
    """

    subject: SubjectType

    @property
    @abstractmethod
    def subject_instructions(self) -> str:
        """Instructions pédagogiques propres à cette matière."""
        ...

    @property
    def subject_tools(self) -> list[dict]:
        """Outils supplémentaires spécifiques à la matière (vide par défaut)."""
        return []

    def get_level_instructions(self, level: str) -> str:
        """Retourne les instructions d'adaptation au niveau scolaire."""
        return LEVEL_INSTRUCTIONS.get(level, LEVEL_INSTRUCTIONS["3ème"])

    def _format_chunks(self, chunks: list[dict]) -> str:
        """Formate les chunks RAG pour injection dans le prompt."""
        if not chunks:
            return (
                "⚠️ Aucun extrait de cours trouvé dans ta bibliothèque pour cette matière.\n"
                "Je vais t'aider du mieux possible, mais ajoute ton cours pour une aide personnalisée."
            )

        parts = []
        for i, chunk in enumerate(chunks, 1):
            similarity_pct = int(chunk.get("similarity", 0) * 100)
            parts.append(
                f"[Extrait {i} — {chunk.get('course_title', 'Cours')} "
                f"({chunk.get('subject', '')}), pertinence {similarity_pct}%]\n"
                f"{chunk.get('content', '')}"
            )

        return "\n\n---\n\n".join(parts)

    def build_system_prompt(self, state: AgentState) -> str:
        """Assemble le system prompt complet : persona + matière + niveau + cours."""
        level = state.get("routed_level", "3ème")
        chunks = state.get("retrieved_chunks", [])

        return f"""{BASE_STUDYBUDDY_PERSONA}

══════════════════════════════════════════
SPÉCIALISATION — {self.subject.upper().replace("_", " ")} :
{self.subject_instructions}

══════════════════════════════════════════
ADAPTATION PÉDAGOGIQUE — NIVEAU {level} :
{self.get_level_instructions(level)}

══════════════════════════════════════════
EXTRAITS DU COURS DE L'ÉLÈVE :
{self._format_chunks(chunks)}

══════════════════════════════════════════
FORMAT DE RÉPONSE ATTENDU :
1. Une phrase d'analyse de l'exercice
2. Étapes numérotées : "Étape 1 :", "Étape 2 :", etc.
   → Chaque étape cite le cours entre guillemets : *"[citation]"*
3. "À retenir :" avec 2-3 points essentiels"""

    def _build_user_prompt(self, state: AgentState) -> str:
        """Construit le prompt utilisateur avec l'énoncé et la réponse de l'élève."""
        prompt = f"**ÉNONCÉ DE L'EXERCICE :**\n{state['exercise_statement']}"

        if state.get("student_answer"):
            prompt += f"\n\n**MA RÉPONSE (à corriger) :**\n{state['student_answer']}"

        if state.get("needs_revision") and state.get("evaluation_feedback"):
            prompt += (
                f"\n\n**NOTE INTERNE (amélioration demandée) :**\n"
                f"{state['evaluation_feedback']}\n"
                f"Révise ta correction en tenant compte de ce retour."
            )

        return prompt

    async def run(self, state: AgentState) -> SpecialistResult:
        """
        Exécute le spécialiste avec gestion du tool use Anthropic.
        Boucle jusqu'à obtenir une réponse finale ou un appel d'outil.
        """
        tools = [RAG_REQUERY_TOOL] + self.subject_tools
        system_prompt = self.build_system_prompt(state)
        user_prompt = self._build_user_prompt(state)

        messages: list[dict] = [{"role": "user", "content": user_prompt}]
        tool_calls_made: list[str] = list(state.get("tool_calls_made", []))

        response = client.messages.create(
            model=settings.correction_model,
            max_tokens=settings.specialist_max_tokens,
            system=system_prompt,
            tools=tools,
            messages=messages,
        )

        # Cas 1 : réponse textuelle directe
        if response.stop_reason == "end_turn":
            text = next(
                (b.text for b in response.content if hasattr(b, "text")), ""
            )
            return SpecialistResult(
                response=text,
                pending_tool_query=None,
                tool_calls_made=tool_calls_made,
            )

        # Cas 2 : l'agent appelle un outil
        if response.stop_reason == "tool_use":
            for block in response.content:
                if block.type == "tool_use" and block.name == "rag_requery":
                    tool_calls_made.append("rag_requery")
                    new_query = block.input.get("new_query", "")
                    return SpecialistResult(
                        response="",
                        pending_tool_query=new_query,
                        tool_calls_made=tool_calls_made,
                    )

        # Fallback : on retourne ce qu'on a
        text = next(
            (b.text for b in response.content if hasattr(b, "text")), ""
        )
        return SpecialistResult(
            response=text,
            pending_tool_query=None,
            tool_calls_made=tool_calls_made,
        )

    async def run_stream(self, state: AgentState):
        """
        Version streaming — yield les tokens au fur et à mesure.
        À appeler depuis l'endpoint SSE.
        Note : pas d'outils ici — le tool_use (rag_requery) n'est pas géré
        en mode streaming, Claude génère directement sa réponse complète.
        """
        system_prompt = self.build_system_prompt(state)
        user_prompt = self._build_user_prompt(state)

        async with async_client.messages.stream(
            model=settings.correction_model,
            max_tokens=settings.specialist_max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        ) as stream:
            async for text in stream.text_stream:
                yield text
