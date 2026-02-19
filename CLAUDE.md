# StudyBuddy — CLAUDE.md

> Référence technique complète du projet. Ce fichier est la source de vérité pour l'architecture, les conventions et les décisions de design.

---

## Table des matières

1. [Vision produit](#1-vision-produit)
2. [Stack technique](#2-stack-technique)
3. [Structure des dossiers](#3-structure-des-dossiers)
4. [Base de données](#4-base-de-données)
5. [Authentification](#5-authentification)
6. [Backend — FastAPI](#6-backend--fastapi)
7. [Pipeline IA — RAG & Agents](#7-pipeline-ia--rag--agents)
8. [Frontend — Next.js](#8-frontend--nextjs)
9. [Design system & UX/UI](#9-design-system--uxui)
10. [Paiement (phase 2)](#10-paiement-phase-2)
11. [Variables d'environnement](#11-variables-denvironnement)
12. [Commandes utiles](#12-commandes-utiles)
13. [Conventions de développement](#13-conventions-de-développement)
14. [Lancer le MVP (checklist)](#14-lancer-le-mvp-checklist)
15. [Roadmap](#15-roadmap)

---

## 1. Vision produit

**StudyBuddy** est un outil d'aide aux devoirs pour collégiens et lycéens (6ème → Terminale).

**Proposition de valeur :**
> L'étudiant prend son cours en photo → le contenu est vectorisé (RAG) → en mode exercice, il prend son énoncé en photo → un agent IA corrige pas-à-pas en s'appuyant exclusivement sur le cours de l'étudiant.

**Différenciateur clé :** la correction est ancrée dans le cours personnel de l'élève, pas dans une base de connaissances générique. Cela force la pédagogie réelle et évite le plagiat.

**Cible :** collégiens et lycéens francophones, leurs parents, et à terme les enseignants.

**Format cible :** webapp PWA mobile-first (iOS/Android via Capacitor en phase 2).

**Matières supportées :** Mathématiques, Français, Physique-Chimie, SVT, Histoire-Géographie, Anglais, Philosophie.

**Niveaux supportés :** 6ème, 5ème, 4ème, 3ème (collège), 2nde, 1ère, Terminale (lycée).

---

## 2. Stack technique

| Couche | Technologie | Version | Rôle |
| --- | --- | --- | --- |
| Frontend | Next.js (App Router) | 14 | PWA mobile-first |
| Langage front | TypeScript | strict | Typage statique |
| Style | Tailwind CSS + shadcn/ui | latest | Design system |
| State management | Zustand | latest | État client |
| Backend | FastAPI (Python) | 0.115 | API REST + SSE |
| Auth | Supabase Auth | latest | JWT + OAuth |
| Base de données | PostgreSQL via Supabase | latest | Données métier |
| Vector store | pgvector via Supabase | latest | RAG embeddings |
| Storage | Supabase Storage | latest | Photos courses |
| Orchestration IA | LangGraph | 0.2.60 | Graphe multi-agent |
| LLM vision + correction | Claude claude-sonnet-4-6 | latest | OCR + correction |
| LLM évaluateur | Claude claude-haiku-4-5-20251001 | latest | Évaluation légère |
| Embeddings | OpenAI text-embedding-3-small | 1536 dims | Vectorisation |
| Déploiement front | Vercel | - | Edge CDN |
| Déploiement back | Railway ou Render | - | Container Python |
| Paiement (phase 2) | Stripe | - | Abonnement mensuel |

---

## 3. Structure des dossiers

```text
studybuddy/
├── CLAUDE.md                    # Ce fichier — source de vérité du projet
├── README.md
├── PropositionUX/               # Maquettes HTML de référence (inspiration design)
│   ├── studybuddy_onboarding/   # Écran d'accueil dark mode
│   ├── course_library/          # Bibliothèque des cours
│   ├── scan_exercise/           # Interface caméra de scan
│   └── ai_guided_learning/      # Chat IA guidé
│
├── frontend/                    # Next.js 14 (App Router) — PWA mobile-first
│   ├── app/
│   │   ├── layout.tsx           # Root layout (Inter, PWA meta, Toaster)
│   │   ├── page.tsx             # Redirect → /cours ou /login selon session
│   │   ├── globals.css          # Tailwind base + utilities (scrollbar-none, pb-safe, pt-safe)
│   │   ├── (auth)/              # Routes non authentifiées
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   └── (app)/               # Routes authentifiées (auth guard dans layout.tsx)
│   │       ├── layout.tsx       # Auth guard SSR + BottomNav
│   │       ├── cours/
│   │       │   ├── page.tsx     # Liste des cours + stats bar
│   │       │   └── upload/page.tsx  # Upload photo (caméra ou galerie)
│   │       ├── exercice/
│   │       │   ├── page.tsx     # Capture énoncé + CorrectionStream
│   │       │   └── [sessionId]/page.tsx  # Détail d'une correction passée
│   │       └── historique/
│   │           └── page.tsx     # Historique des corrections (IndexedDB)
│   ├── components/
│   │   ├── ui/                  # shadcn/ui (button, card, badge, input, toast, skeleton, progress)
│   │   ├── auth/                # LoginForm, RegisterForm
│   │   ├── cours/               # CourseCard, CourseList, CourseUploader
│   │   ├── exercice/            # ExerciseCapture, CorrectionStream, FeedbackBar, SourceCard (inline)
│   │   ├── layout/              # BottomNav (Lucide icons), Header (sticky blur), PageWrapper
│   │   └── shared/              # SubjectBadge, Spinner, ImagePicker, MathRenderer (KaTeX)
│   ├── lib/
│   │   ├── api.ts               # uploadCourse, listCourses, deleteCourse, correctExercise,
│   │   │                        #   getCorrectStreamUrl, submitFeedback
│   │   ├── supabase.ts          # createClient() — browser
│   │   ├── supabase-server.ts   # createClient() — server components (@supabase/ssr)
│   │   └── utils.ts             # cn() helper (shadcn)
│   ├── store/
│   │   ├── auth.store.ts        # user, session (Zustand)
│   │   ├── cours.store.ts       # courses, chapters, uploadProgress (Zustand)
│   │   └── history.store.ts     # entries (Zustand + idb-keyval, offline)
│   ├── hooks/
│   │   ├── useCamera.ts         # Accès caméra PWA (getUserMedia)
│   │   ├── useCorrectionStream.ts # Consommation SSE via fetch + ReadableStream
│   │   ├── useHistory.ts        # Chargement IndexedDB au montage
│   │   └── useUser.ts           # Sync session Supabase → auth store
│   ├── types/
│   │   └── index.ts             # Course, Chapter, HistoryEntry, SSEEvent, SUBJECTS, LEVELS…
│   ├── public/
│   │   ├── manifest.json        # PWA manifest (standalone, fr, icons 192/512)
│   │   └── icons/               # App icons (à générer : icon-192.png, icon-512.png)
│   ├── next.config.mjs          # next-pwa (SW désactivé en dev), images WebP/AVIF
│   ├── tailwind.config.ts       # Inter font, shadcn tokens
│   ├── .env.local.example       # Template des variables d'env frontend
│   └── package.json
│
├── backend/                     # FastAPI — Python
│   ├── main.py                  # App FastAPI, CORS, routers (cours + exercice)
│   ├── config.py                # Settings pydantic-settings
│   ├── requirements.txt
│   ├── .env.example
│   ├── api/
│   │   ├── __init__.py
│   │   ├── cours.py             # POST /upload (sync), GET /, DELETE /{id}
│   │   ├── exercice.py          # POST /correct, POST /correct/stream (SSE)
│   │   └── feedback.py          # POST /feedback — À CRÉER (table prête en migration 004)
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── ocr.py               # Claude Vision → OCRCourseResult / OCRExerciseResult
│   │   ├── chunking.py          # Chunking sémantique/structurel
│   │   ├── embeddings.py        # OpenAI text-embedding-3-small → 1536d
│   │   └── retrieval.py         # store_chunks / search_relevant_chunks (pgvector RPC)
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── state.py             # AgentState TypedDict + SUBJECT_MAPPING
│   │   ├── graph.py             # build_graph() LangGraph
│   │   ├── nodes/               # ocr_node, orchestrator, rag_retrieval, rag_requery,
│   │   │                        #   evaluator, output_node
│   │   └── specialists/         # base_specialist + 7 spécialistes (math, fr, pc, svt, hg, en, philo)
│   └── db/
│       ├── __init__.py
│       └── client.py            # get_supabase() singleton (service_role_key)
│
└── supabase/
    └── migrations/
        ├── 001_init.sql         # courses, course_chunks, pgvector, RLS, search RPC
        ├── 002_agent_sessions.sql  # agent_sessions (audit)
        ├── 003_chapters.sql     # À CRÉER — chapters + FK courses.chapter_id
        └── 004_feedback.sql     # À CRÉER — correction_feedback
```

---

## 4. Base de données

Toute la persistance est dans Supabase (PostgreSQL + pgvector). Le backend utilise le `service_role_key` (bypass RLS). Le frontend utilise l'`anon_key` (RLS appliqué).

### Table `courses`

Stocke les cours uploadés par les élèves.

| Colonne | Type | Description |
| --- | --- | --- |
| `id` | UUID PK | Identifiant unique |
| `user_id` | UUID | Référence à `auth.users` |
| `title` | TEXT | Titre extrait par OCR |
| `subject` | TEXT | Matière (ex: "Mathématiques") |
| `level` | TEXT | Niveau (ex: "3ème") |
| `keywords` | TEXT[] | Mots-clés extraits |
| `raw_content` | TEXT | Texte brut OCR complet |
| `created_at` | TIMESTAMPTZ | Date d'upload |
| `updated_at` | TIMESTAMPTZ | Dernière modification |

Index : `(user_id)`, `(user_id, subject)`

### Table `course_chunks`

Chunks vectorisés des cours (utilisés pour le RAG).

| Colonne | Type | Description |
| --- | --- | --- |
| `id` | UUID PK | Identifiant unique |
| `course_id` | UUID FK → courses | Cours parent (CASCADE DELETE) |
| `user_id` | UUID | Dupliqué pour filtre RLS rapide |
| `content` | TEXT | Texte du chunk |
| `embedding` | VECTOR(1536) | Vecteur OpenAI text-embedding-3-small |
| `chunk_index` | INTEGER | Ordre dans le cours |
| `metadata` | JSONB | Sujet, titre, keywords |
| `created_at` | TIMESTAMPTZ | Date de création |

Index : HNSW `(embedding vector_cosine_ops)` m=16, ef_construction=64

### Table `agent_sessions`

Audit des corrections effectuées.

| Colonne | Type | Description |
| --- | --- | --- |
| `id` | UUID PK | Session ID |
| `user_id` | UUID | Élève |
| `subject` | TEXT | Matière corrigée |
| `level` | TEXT | Niveau détecté |
| `exercise_type` | TEXT | "Problème", "QCM", etc. |
| `specialist_used` | TEXT | Spécialiste IA utilisé |
| `rag_iterations` | INTEGER | Nb de re-queries RAG |
| `evaluation_score` | FLOAT | Score haiku (0.0–1.0) |
| `chunks_found` | INTEGER | Nb de chunks RAG trouvés |
| `needs_revision` | BOOLEAN | Révision effectuée |
| `duration_ms` | INTEGER | Durée totale de correction |
| `created_at` | TIMESTAMPTZ | Date |

### Fonction RPC `search_course_chunks`

Recherche vectorielle avec filtres :

- `query_embedding` VECTOR(1536)
- `user_id_filter` UUID
- `match_count` INTEGER (défaut 5)
- `subject_filter` TEXT (optionnel)
- `similarity_threshold` FLOAT (défaut 0.3)

Retourne : `id, course_id, course_title, subject, content, chunk_index, similarity`

### Table `chapters` (migration 003)

Regroupe plusieurs cours sous un même chapitre. Tous les cours d'un chapitre sont accessibles par les agents lors d'une correction — l'élève n'a pas à choisir quel cours précis utiliser, le RAG cherche dans tout le chapitre.

| Colonne | Type | Description |
| --- | --- | --- |
| `id` | UUID PK | Identifiant unique |
| `user_id` | UUID | Propriétaire |
| `title` | TEXT | "Chapitre 3 — Fonctions dérivées" |
| `subject` | TEXT | Matière |
| `level` | TEXT | Niveau |
| `created_at` | TIMESTAMPTZ | Date de création |

La table `courses` recevra une FK nullable `chapter_id → chapters(id)`. Un cours sans chapitre reste accessible seul. Le retrieval filtre sur `chapter_id` si présent, sinon sur `user_id + subject`.

### Table `correction_feedback`

Stocke les retours 👍/👎 des élèves sur chaque correction.

| Colonne | Type | Description |
| --- | --- | --- |
| `id` | UUID PK | Identifiant unique |
| `session_id` | UUID FK → agent_sessions | Correction évaluée |
| `user_id` | UUID | Élève |
| `rating` | SMALLINT | 1 (👍) ou -1 (👎) |
| `comment` | TEXT | Commentaire libre (optionnel) |
| `created_at` | TIMESTAMPTZ | Date |

### Row Level Security

RLS activé sur `courses`, `course_chunks`, `agent_sessions`, `chapters`, `correction_feedback`.
Politique : `auth.uid() = user_id` pour SELECT/INSERT/UPDATE/DELETE.
Le backend contourne le RLS via `service_role_key`.

### Tables futures (phase 2)

```sql
-- Plans d'abonnement
CREATE TABLE plans (
    id          TEXT PRIMARY KEY,   -- 'free', 'premium', 'family'
    name        TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    features    JSONB DEFAULT '{}'
);

-- Abonnements utilisateurs (lié à Stripe)
CREATE TABLE subscriptions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID REFERENCES auth.users,
    plan_id               TEXT REFERENCES plans(id),
    stripe_customer_id    TEXT,
    stripe_subscription_id TEXT,
    status                TEXT,   -- 'active', 'cancelled', 'past_due'
    current_period_end    TIMESTAMPTZ,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Quotas d'utilisation
CREATE TABLE usage_quotas (
    user_id        UUID PRIMARY KEY REFERENCES auth.users,
    corrections_used INTEGER DEFAULT 0,
    corrections_max  INTEGER DEFAULT 10,   -- 10/mois en free
    uploads_used   INTEGER DEFAULT 0,
    reset_at       TIMESTAMPTZ
);
```

---

## 5. Authentification

### Provider : Supabase Auth

- Email + mot de passe (MVP)
- Google OAuth (phase 2)
- Magic link (phase 2 optionnel)

### Flux d'authentification (MVP)

```text
[Register page]
  → POST /auth/v1/signup (Supabase)
  → Supabase envoie email de confirmation
  → Redirect vers /cours

[Login page]
  → POST /auth/v1/token?grant_type=password (Supabase)
  → Retour : access_token (JWT) + refresh_token
  → Stocké dans cookie HttpOnly via Supabase SSR helpers
  → Redirect vers /cours

[Auth Guard]
  → Layout (app) vérifie session côté serveur (supabase-server.ts)
  → Si pas de session → redirect /login
```

### Token management

- JWT Supabase avec `exp` 1h
- Refresh automatique via `supabase-js` (client-side)
- Côté SSR : `@supabase/ssr` pour cookies sécurisés
- Le backend reçoit le JWT dans `Authorization: Bearer <token>` (phase 2, actuellement `user_id` en form field)

### Sécurité côté backend (phase 2)

```python
# Middleware d'authentification à ajouter en phase 2
# Vérifier le JWT Supabase dans Authorization header
# Extraire user_id depuis le payload au lieu de le recevoir en form field
```

---

## 6. Backend — FastAPI

### Configuration (`config.py`)

Toutes les settings sont dans `Settings(BaseSettings)` chargées depuis `.env` :

| Setting | Valeur par défaut | Description |
| --- | --- | --- |
| `vision_model` | `claude-sonnet-4-6` | Modèle OCR |
| `correction_model` | `claude-sonnet-4-6` | Modèle correction |
| `embedding_model` | `text-embedding-3-small` | Modèle embeddings OpenAI |
| `embedding_dimensions` | 1536 | Dimensions vecteur |
| `chunk_size` | 800 | Taille chunk (tokens) |
| `chunk_overlap` | 100 | Chevauchement chunks |
| `retrieval_top_k` | 5 | Chunks RAG initial |
| `specialist_top_k` | 7 | Chunks RAG spécialiste |
| `evaluator_model` | `claude-haiku-4-5-20251001` | Modèle évaluation |
| `specialist_max_tokens` | 2048 | Tokens max correction |
| `evaluator_max_tokens` | 512 | Tokens max évaluation |
| `max_rag_iterations` | 2 | Re-queries max par session |

### Routes API

#### `POST /api/cours/upload`

Upload une photo de cours → OCR → vectorisation → stockage.

- **Input :** `file` (UploadFile), `user_id` (Form)
- **Formats acceptés :** JPEG, PNG, WEBP, HEIC/HEIF (max 10 MB)
- **Output :** `CourseResponse` (id, title, subject, level, keywords, chunk_count, created_at)
- **Pipeline :** `extract_course_from_image()` → `chunk_course_text()` → `embed_chunks()` → `store_chunks()`

#### `GET /api/cours/`

Liste les cours d'un utilisateur, triés par date décroissante.

- **Input :** `user_id` (query param)
- **Output :** `list[CourseListItem]`

#### `DELETE /api/cours/{course_id}`

Supprime un cours et tous ses chunks vectorisés (CASCADE).

- **Input :** `course_id` (path), `user_id` (query param)
- **Vérification propriété :** query `courses WHERE id=? AND user_id=?`

#### `POST /api/exercice/correct`

Correction complète via graphe LangGraph (réponse JSON synchrone).

- **Input :** `file` (UploadFile), `user_id`, `subject` (override optionnel), `student_answer` (optionnel)
- **Output :** `CorrectionResponse` (session_id, exercise_statement, subject, level, exercise_type, specialist_used, correction, sources_used, chunks_found, evaluation_score, rag_iterations)

#### `POST /api/exercice/correct/stream`

Correction avec streaming SSE — affichage progressif côté frontend.

**Séquence d'events garantie :**

```json
{"type": "start", "session_id": "uuid"}
{"type": "phase", "phase": "ocr", "status": "running"}
{"type": "phase", "phase": "ocr", "status": "done", "subject": "...", "exercise_type": "..."}
{"type": "phase", "phase": "rag", "status": "running"}
{"type": "phase", "phase": "rag", "status": "done", "chunks_found": 5}
{"type": "phase", "phase": "specialist", "status": "running", "specialist": "mathematiques", "level": "3ème"}
{"type": "token", "text": "..."}
{"type": "phase", "phase": "evaluating", "status": "done"}
{"type": "done", "session_id": "...", "sources": [...], "evaluation_score": 0.85}
```

**En cas d'erreur :**

```json
{"type": "error", "code": "OCR_FAILED", "message": "..."}
{"type": "error", "code": "OCR_EMPTY", "message": "..."}
```

#### `GET /health`

Health check. Retourne `{"status": "ok", "version": "0.1.0"}`.

---

## 7. Pipeline IA — RAG & Agents

### Architecture LangGraph

Le graphe est un `StateGraph(AgentState)` avec les noeuds suivants :

```text
START
  → ocr_node
  → [route_to_error_or_continue]
      ↓ ok
  → orchestrator_node
  → rag_retrieval_node
  → [route_by_subject] → specialist_node (math/fr/pc/svt/hg/en/philo)
  → [after_specialist]
      ↓ needs more context (et rag_iterations < max)
  → rag_requery_node → [back to specialist]
      ↓ ok
  → evaluator_node
  → [after_evaluator]
      ↓ needs_revision (et revision_count < 1)
  → prepare_revision_node → rag_retrieval_node → specialist_node
      ↓ ok
  → output_node
  → END
```

### État partagé (`AgentState`)

TypedDict central — contrat entre tous les noeuds :

```python
# Entrées
user_id: str
image_bytes: bytes
student_answer: str | None
subject_override: str | None
stream_enabled: bool

# OCR
exercise_statement: str
detected_subject: str | None
detected_level: str | None
exercise_type: str                  # "Problème", "QCM", "Dissertation", etc.

# Routing
routed_subject: SubjectType         # clé normalisée
routed_level: SchoolLevel           # "6ème" → "Terminale"

# RAG
rag_query: str
retrieved_chunks: list[dict]
rag_iterations: int

# Correction
specialist_response: str
tool_calls_made: list[str]
pending_tool_query: str | None      # nouvelle requête RAG demandée

# Évaluation
evaluation_score: float             # 0.0 – 1.0
evaluation_feedback: str
needs_revision: bool
revision_count: int

# Sortie
final_response: str
sources_used: list[str]
chunks_found: int
specialist_used: str

# Contrôle
error: str | None
session_id: str
```

### Noeuds détaillés

**`ocr_node`** — Appel Claude Vision pour extraire l'énoncé, la matière, le niveau et le type d'exercice depuis l'image.

**`orchestrator_node`** — Normalise la matière (`SUBJECT_MAPPING`), détermine le niveau, construit la requête RAG (pas d'appel LLM, logique déterministe).

**`rag_retrieval_node`** — Vectorise la `rag_query` (OpenAI embeddings) → appel RPC `search_course_chunks` → peuple `retrieved_chunks`.

**`rag_requery_node`** — Si `pending_tool_query` n'est pas None, effectue une nouvelle recherche vectorielle et ajoute les chunks (dédupliqués) à `retrieved_chunks`. Incrémente `rag_iterations`.

**`evaluator_node`** — Appel Claude Haiku léger : évalue la qualité de la correction (`evaluation_score` 0.0–1.0) et décide si `needs_revision`. Rapide et économique.

**`output_node`** — Formate `final_response` et `sources_used` proprement depuis `specialist_response`.

**`error_end_node`** — Finalise l'état en cas d'erreur.

**`prepare_revision_node`** — Incrémente `revision_count` avant de relancer le spécialiste.

### Spécialistes (`base_specialist.py`)

Classe abstraite avec :

- `run(state: AgentState) -> SpecialistResult` — correction synchrone
- `run_stream(state: AgentState) -> AsyncGenerator[str, None]` — streaming tokens

Chaque spécialiste a un system prompt adapté à sa matière et à la pédagogie du niveau scolaire. Le spécialiste peut demander plus de contexte via un `tool_call` (→ `pending_tool_query`).

**Mode socratique (décision produit confirmée)** — Le spécialiste ne donne PAS la réponse directement. Il guide l'élève avec des indices ancrés dans son propre cours :

- Niveau collège : indices directs ("Regarde ta définition de la priorité des opérations...")
- Niveau lycée : indices plus abstraits, questionnement logique ("Qu'est-ce que cette propriété implique si x est négatif ?")
- La réponse complète n'est donnée qu'en dernier recours (après 2 indices ignorés)
- Chaque indice cite explicitement un extrait du cours de l'élève (source visible)

**Matières :** `mathematiques`, `francais`, `physique_chimie`, `svt`, `histoire_geo`, `anglais`, `philosophie`.

### Pipeline RAG

1. **OCR (Claude Vision)** : image → texte structuré
2. **Chunking sémantique** : découpe sur marqueurs structurels du cours (titres, Définition :, Propriété :, Exemple :, numérotation romaine). Min 150 tokens / max 1000 tokens par chunk. Préféré au chunking à taille fixe car les cours scolaires ont une structure forte et lisible. Implémenté dans `rag/chunking.py`.
3. **Embedding** : OpenAI `text-embedding-3-small`, 1536 dimensions
4. **Stockage** : pgvector avec index HNSW (m=16, ef_construction=64). Cache local par hash du contenu OCR — si deux utilisateurs uploadent le même manuel, les chunks identiques ne sont pas re-embedés.
5. **Retrieval** : cosine similarity, seuil 0.3, top-K filtré par user + matière **et par chapitre si précisé**
6. **Reranking** : après retrieval initial, cross-scorer les chunks par pertinence réelle avant injection dans le prompt spécialiste (à implémenter)
7. **Re-query** : max 2 itérations supplémentaires si le spécialiste le demande

---

## 8. Frontend — Next.js

### Pages implémentées

| Route | Description | Auth | Statut |
| --- | --- | --- | --- |
| `/` | Redirect → /cours ou /login | Non | ✅ |
| `/login` | Connexion email/password | Non | ✅ |
| `/register` | Inscription | Non | ✅ |
| `/cours` | Liste des cours + stats bar | Oui | ✅ |
| `/cours/upload` | Upload photo (caméra/galerie) + OCR | Oui | ✅ |
| `/exercice` | Capture énoncé + correction SSE | Oui | ✅ |
| `/exercice/[sessionId]` | Détail correction passée (IndexedDB) | Oui | ✅ |
| `/historique` | Historique corrections offline | Oui | ✅ |
| `/cours/chapitre/[id]` | Détail d'un chapitre | Oui | Phase 2 |

### Composants clés

**`CourseUploader`** — Upload avec caméra native ou galerie. États : select → preview → uploading (avec labels de progression) → done/error.

**`ExerciseCapture`** — Écran de scan inspiré des maquettes PropositionUX :
- Viewfinder sombre avec **corner brackets** en indigo
- **Sélecteur de matières horizontal scrollable** (pills radio-style, matière optionnelle)
- Bouton shutter anneau + cercle (active:scale-90)

**`CorrectionStream`** — Style chat inspiré des maquettes AI Guided Learning :
- Phase tracker en haut (OCR → RAG → Spécialiste → Évaluation)
- **Bulle IA** avec avatar bot indigo + coin `rounded-tl-none`
- **Source cards inline** sous la réponse (inspiré reference cards maquette)
- Score de qualité + FeedbackBar en bas

**`BottomNav`** — Navigation sticky (Cours | Exercice | Historique). Lucide icons, `bg-white/95 backdrop-blur-sm`.

**`Header`** — Sticky avec `bg-white/80 backdrop-blur-xl` (iOS-style). Utilisé sur toutes les pages app.

**`MathRenderer`** — Parse `$...$` et `$$...$$` avec KaTeX pendant le streaming SSE. Rendu LaTeX non-bloquant.

### Gestion d'état (Zustand)

```typescript
// auth.store.ts
interface AuthStore {
  user: User | null;
  session: Session | null;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
}

// cours.store.ts
interface CoursStore {
  courses: Course[];
  chapters: Chapter[];
  isUploading: boolean;
  uploadProgress: 'idle' | 'ocr' | 'embedding' | 'done' | 'error';
  setCourses: (courses: Course[]) => void;
  setChapters: (chapters: Chapter[]) => void;
  setUploadProgress: (p: CoursStore['uploadProgress']) => void;
}

// history.store.ts — persisté dans IndexedDB (idb-keyval ou Dexie)
// L'historique est local : pas de requête backend, consultation offline possible
interface HistoryEntry {
  sessionId: string;
  date: string;
  subject: string;
  level: string;
  exerciseStatement: string;
  correction: string;       // texte complet de la correction
  sources: string[];
  evaluationScore: number;
  feedback: 1 | -1 | null;
}

interface HistoryStore {
  entries: HistoryEntry[];
  addEntry: (entry: HistoryEntry) => void;
  clear: () => void;
}
```

### Client API (`lib/api.ts`)

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL; // ex: https://api.studybuddy.fr

// Upload cours
export async function uploadCourse(file: File, userId: string): Promise<CourseResponse>

// Liste cours
export async function listCourses(userId: string): Promise<CourseListItem[]>

// Supprimer cours
export async function deleteCourse(courseId: string, userId: string): Promise<void>

// Correction (JSON)
export async function correctExercise(params: CorrectParams): Promise<CorrectionResponse>

// Correction streaming (SSE)
export function correctExerciseStream(params: CorrectParams): EventSource
```

### Hook `useCorrectionStream`

```typescript
interface CorrectionState {
  phase: 'idle' | 'ocr' | 'rag' | 'specialist' | 'evaluating' | 'done' | 'error';
  tokens: string;           // tokens accumulés
  subject: string | null;
  level: string | null;
  specialist: string | null;
  sources: string[];
  chunksFound: number;
  evaluationScore: number;
  sessionId: string | null;
  error: string | null;
}
```

Implémentation : `fetch()` + `ReadableStream` (pas EventSource — permet POST multipart).

### PWA (Progressive Web App)

- `manifest.json` : name, short_name, `display: standalone`, `theme_color: #6366F1`, lang: fr
- `next.config.mjs` : next-pwa avec workbox (SW désactivé en `development`)
- Service Worker auto-généré dans `public/sw.js`
- `viewport` : `width=device-width, initial-scale=1, maximum-scale=1, userScalable=false`
- Icons à générer : `public/icons/icon-192.png` et `icon-512.png`

---

## 9. Design system & UX/UI

### Principes UX

1. **Mobile-first absolu** — Toute interface conçue d'abord pour 375px (iPhone SE). Pas de layout desktop prioritaire en MVP.
2. **Zero friction** — L'élève doit pouvoir démarrer une correction en < 3 taps depuis l'ouverture de l'app.
3. **Feedback immédiat** — Chaque action a un retour visuel (skeleton, spinner, progress). Jamais de vide.
4. **Pédagogie visible** — La correction affiche toujours les sources (extraits du cours). L'élève voit d'où vient la réponse.
5. **Ton bienveillant** — Messages en français, ton encourageant. Pas de "Erreur 422", mais "On n'a pas réussi à lire ta photo, réessaie avec plus de lumière."

### Palette de couleurs

| Token | Valeur | Usage |
| --- | --- | --- |
| `primary` | `#6366F1` (indigo-500) | CTAs, éléments actifs |
| `primary-dark` | `#4F46E5` (indigo-600) | Hover CTA |
| `surface` | `#FFFFFF` | Cartes, modales |
| `background` | `#F8FAFC` (slate-50) | Fond de page |
| `text-primary` | `#0F172A` (slate-900) | Texte principal |
| `text-secondary` | `#64748B` (slate-500) | Texte secondaire |
| `border` | `#E2E8F0` (slate-200) | Bordures |
| `success` | `#10B981` (emerald-500) | Score élevé, succès |
| `warning` | `#F59E0B` (amber-500) | Score moyen |
| `error` | `#EF4444` (red-500) | Erreurs |

**Couleurs par matière :**

| Matière | Couleur | Classe Tailwind |
| --- | --- | --- |
| Mathématiques | Bleu | `bg-blue-100 text-blue-700` |
| Français | Violet | `bg-purple-100 text-purple-700` |
| Physique-Chimie | Orange | `bg-orange-100 text-orange-700` |
| SVT | Vert | `bg-green-100 text-green-700` |
| Histoire-Géo | Ambre | `bg-amber-100 text-amber-700` |
| Anglais | Cyan | `bg-cyan-100 text-cyan-700` |
| Philosophie | Rose | `bg-rose-100 text-rose-700` |

### Typographie

- **Police principale :** Inter (Google Fonts, variable)
- **Police code/maths :** JetBrains Mono (pour formules, code)
- **Tailles :** `text-sm` (corps), `text-base` (normal), `text-lg` (h3), `text-xl` (h2), `text-2xl` (h1)
- **Poids :** 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

### Composants UI — conventions

```typescript
// Toujours utiliser les composants shadcn/ui comme base
// Customiser via className, jamais via style inline
// Variantes : 'default' | 'destructive' | 'outline' | 'ghost'

// Exemple bouton CTA principal
<Button size="lg" className="w-full bg-primary hover:bg-primary-dark">
  Prendre en photo
</Button>
```

### Animations

- Transitions : `duration-200 ease-in-out` (standard), `duration-300` (modales)
- Loading skeleton : `animate-pulse bg-slate-200 rounded`
- Tokens streaming : curseur clignotant `animate-pulse` inline après le dernier token
- Phases de correction : icônes `animate-pulse` + dots bouncing pendant la phase active
- Shutter : `active:scale-90 transition-transform duration-100`

### Patterns UX inspirés de PropositionUX

Les maquettes dans `PropositionUX/` ont inspiré (en conservant le light mode) :

| Pattern | Source | Implémentation |
| --- | --- | --- |
| Viewfinder corner brackets | scan_exercise | `ViewfinderCorners` dans `ExerciseCapture` |
| Sélecteur matières horizontal | scan_exercise | Pills scrollables, `scrollbar-none` |
| Bouton shutter anneau+cercle | scan_exercise | Anneau indigo + inner circle + active:scale |
| Chat bubbles asymétriques | ai_guided_learning | `rounded-tl-none` sur bulle IA |
| Source cards inline | ai_guided_learning | `InlineSourceCard` sous la bulle |
| Stats bar bibliothèque | course_library | Cours/Matières/IA dans `/cours` |
| Header sticky blur | course_library | `bg-white/80 backdrop-blur-xl` sur tous les headers |

### Rendu mathématique et scientifique

Les corrections de maths, physique-chimie et SVT contiennent des formules. Le texte brut est illisible — le rendu LaTeX est indispensable.

- **Librairie :** KaTeX (`react-katex`) — plus rapide que MathJax, ne bloque pas le rendu SSE
- **Délimiteurs :** `$...$` pour inline, `$$...$$` pour block
- **Les spécialistes** doivent être promptés pour utiliser ces délimiteurs dans leurs réponses
- **Composant `MathRenderer`** : parse le texte token par token pendant le streaming, détecte les délimiteurs, rend les formules au fur et à mesure
- **Formules chimiques** (SVT, Chimie) : utiliser `mhchem` (extension KaTeX) pour `\ce{H2O}`, `\ce{CO2}`

### Upload asynchrone (queue)

L'OCR + embedding d'un cours prend 5-15s. Une réponse HTTP synchrone risque le timeout mobile.

**Architecture :**

1. `POST /api/cours/upload` retourne immédiatement `{ job_id, status: "processing" }`
2. Un worker asynchrone (Celery + Redis, ou Supabase Edge Function) traite l'OCR + embedding
3. Le frontend poll `GET /api/cours/jobs/{job_id}` toutes les 2s (ou SSE dédié)
4. Quand `status: "done"` → afficher le cours dans la liste

**Statuts du job :**

- `queued` → `ocr_running` → `embedding_running` → `done` | `error`

### Mobile UX spécifique

- Zone de tap minimum : 44×44px (guidelines Apple/Google)
- Bottom navigation sticky avec safe area (`pb-safe`)
- Pull-to-refresh sur la liste des cours et l'historique
- Camera permission : demandée lazily, message clair si refusée
- Image preview avant envoi (possibilité de reprendre la photo)
- Keyboard avoidance sur les formulaires
- Historique accessible offline (IndexedDB) — pas besoin de réseau pour consulter ses corrections passées

---

## 10. Paiement (phase 2)

> Stripe intégration après validation du MVP. Ne pas coder avant.

### Modèle freemium

| Plan | Prix | Limites |
| --- | --- | --- |
| **Gratuit** | 0 €/mois | 10 corrections/mois, 5 cours max |
| **Premium** | 9,99 €/mois | Illimité, toutes matières |
| **Famille** | 14,99 €/mois | 3 élèves, illimité |

### Architecture Stripe

- **Stripe Checkout** : redirection vers page Stripe pour le paiement
- **Stripe Webhooks** : écoute `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
- **Stripe Customer Portal** : gestion abonnement par l'utilisateur (annulation, changement CB)

### Endpoints à créer (phase 2)

```text
POST /api/billing/create-checkout-session  → URL Stripe Checkout
POST /api/billing/webhook                  → Stripe webhook handler
GET  /api/billing/portal                   → URL Customer Portal
GET  /api/billing/status                   → Plan actuel de l'utilisateur
```

### Gating des features

```python
# Middleware à ajouter sur les routes protégées
async def check_quota(user_id: str, action: str) -> None:
    """Vérifie que l'utilisateur peut effectuer l'action selon son plan."""
    # Lire usage_quotas depuis la DB
    # Lever HTTPException 429 si quota dépassé
```

---

## 11. Variables d'environnement

### Backend (`backend/.env`)

```env
# Anthropic (OCR + correction + évaluation)
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (embeddings uniquement)
OPENAI_API_KEY=sk-...

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# CORS
CORS_ORIGINS=http://localhost:3000,https://studybuddy.vercel.app

# Environnement
ENVIRONMENT=development   # ou production
```

### Frontend (`frontend/.env.local`)

```env
# URL du backend FastAPI
NEXT_PUBLIC_API_URL=http://localhost:8000

# Supabase (public — client-side)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Supabase (secret — server components uniquement)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Variables de production à configurer

- **Vercel** : `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Railway/Render** : toutes les variables du backend
- **Supabase** : activé en production avec pgvector, Storage bucket `course-images`

---

## 12. Commandes utiles

```bash
# ── Frontend ──────────────────────────────────────────────────
cd frontend
npm install
npm run dev          # http://localhost:3000
npm run build        # Build production
npm run lint         # ESLint
npm run type-check   # tsc --noEmit

# ── Backend ───────────────────────────────────────────────────
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload  # http://localhost:8000
# Docs API : http://localhost:8000/docs

# ── Supabase local ────────────────────────────────────────────
supabase start             # Lance la stack locale
supabase db reset          # Reapplique toutes les migrations
supabase migration new <nom>  # Crée une nouvelle migration
supabase db push           # Push migrations vers le projet remote

# ── Tests (à implémenter) ─────────────────────────────────────
cd backend
pytest tests/ -v
pytest tests/test_rag.py -v   # Tests unitaires RAG
```

---

## 13. Conventions de développement

### Général

- **Langue du code :** anglais (variables, fonctions, commentaires, noms de fichiers)
- **Langue des messages utilisateur :** français (UI, messages d'erreur, prompts IA)
- **Commits :** Conventional Commits — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- **Branches :** `feat/nom-feature`, `fix/nom-bug`, `chore/nom-tache`

### Python (backend)

- **Type hints obligatoires** sur toutes les fonctions publiques
- **Pydantic** pour tous les modèles de données (input/output API)
- **pydantic-settings** pour la configuration
- Pas de `print()` — utiliser `logging` (à brancher)
- Async/await : tout le code I/O est async (Anthropic, OpenAI, Supabase async)
- Exceptions : `HTTPException` pour les erreurs API, exceptions Python standard sinon
- Imports : stdlib → third-party → local (séparés par ligne vide)

### TypeScript (frontend)

- **strict mode activé** (`tsconfig.json`)
- Pas de `any` — typer explicitement ou utiliser `unknown`
- `interface` pour les objets de données, `type` pour les unions/aliases
- Components : functional components uniquement, pas de class components
- Hooks : préfixe `use`, dans `hooks/`
- Pas de `useEffect` pour fetcher des données — utiliser `server components` ou `SWR`/`React Query`
- `'use client'` seulement si vraiment nécessaire (interactions, state, browser APIs)

### Naming conventions

| Élément | Convention | Exemple |
| --- | --- | --- |
| Fichiers React | `kebab-case.tsx` | `course-card.tsx` |
| Composants | `PascalCase` | `CourseCard` |
| Hooks | `camelCase` avec `use` | `useCorrectionStream` |
| Stores Zustand | `camelCase.store.ts` | `auth.store.ts` |
| Fonctions Python | `snake_case` | `extract_course_from_image` |
| Classes Python | `PascalCase` | `MathematiquesSpecialist` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_IMAGE_SIZE` |
| Tables SQL | `snake_case` pluriel | `course_chunks` |
| Colonnes SQL | `snake_case` | `created_at` |

### Sécurité

**Règles de base :**

- Ne jamais exposer `service_role_key` côté frontend
- Ne jamais logger les clés API ou tokens
- Valider tous les inputs côté backend (Pydantic + limites de taille)
- Extraire `user_id` depuis le JWT Supabase (middleware FastAPI) — **ne jamais l'accepter en form field en production**
- Images : valider `content_type` ET magic bytes
- CORS : liste blanche explicite (pas `*` en production)

**Rate limiting (priorité haute avant production) :**

- `/api/exercice/correct` et `/correct/stream` : max 10 req/min par user, 30 req/heure
- `/api/cours/upload` : max 5 req/min par user
- Implémenté via `slowapi` (FastAPI) + Redis ou en mémoire en développement
- Dépassement → HTTP 429 avec message clair en français ("Tu as atteint ta limite pour ce soir, réessaie demain !")
- Surveillance des usages excessifs : alerter si un user dépasse 3× son quota habituel sur une fenêtre glissante
- Throttling progressif (pas de coupure sèche) : ralentir les réponses avant de couper

**Monitoring des abus :**

- Logger dans `agent_sessions` : `duration_ms`, `user_id`, `created_at` → permettent de détecter des patterns anormaux
- Alerte si coût Anthropic dépasse un seuil quotidien (webhook Anthropic ou script cron)
- Dashboard interne (Supabase Studio ou Metabase) sur les sessions par user/jour

---

## 14. Lancer le MVP (checklist)

```bash
# 1. Supabase — appliquer les migrations
supabase db push   # ou supabase db reset en local

# 2. Backend
cp backend/.env.example backend/.env
# → Remplir ANTHROPIC_API_KEY, OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
cd backend && pip install -r requirements.txt
uvicorn main:app --reload   # → http://localhost:8000/docs

# 3. Frontend
cp frontend/.env.local.example frontend/.env.local
# → Remplir NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# → NEXT_PUBLIC_API_URL=http://localhost:8000
cd frontend && npm install && npm run dev   # → http://localhost:3000

# 4. Générer les icônes PWA (requis pour manifest)
# Créer public/icons/icon-192.png et icon-512.png (logo StudyBuddy)
```

**Ce qui fonctionnera au premier lancement :**
- ✅ Inscription / connexion
- ✅ Upload d'un cours (synchrone, 5–15s selon OCR)
- ✅ Correction d'exercice avec streaming SSE
- ✅ Affichage LaTeX (maths, physique)
- ✅ Historique offline
- ⚠️ Feedback 👍/👎 : enregistré localement, POST backend silencieusement ignoré (endpoint manquant)

---

## 15. Roadmap

### Phase 1 — MVP (état actuel)

**Backend ✅ fait :**

- [x] Architecture FastAPI + Supabase
- [x] Pipeline RAG (OCR → chunking → embedding → retrieval)
- [x] Graphe LangGraph multi-agent (7 spécialistes)
- [x] API cours (upload synchrone, liste, suppression)
- [x] API exercice (correction JSON + streaming SSE)
- [x] Migrations SQL 001 + 002 (pgvector, RLS, agent_sessions)

**Frontend ✅ fait :**

- [x] Setup Next.js 14 + routing App Router + shadcn/ui + Tailwind
- [x] Authentification (login / register / auth guard SSR)
- [x] Flux cours : liste + stats bar + upload (caméra/galerie)
- [x] Flux exercice : ExerciseCapture (viewfinder) + CorrectionStream SSE (chat-style)
- [x] Rendu LaTeX avec KaTeX (`MathRenderer`)
- [x] `FeedbackBar` (👍/👎) — local + appel backend best-effort
- [x] Historique offline (IndexedDB via `idb-keyval`)
- [x] PWA manifest + Service Worker (next-pwa)
- [x] Build propre (0 erreurs TypeScript + ESLint)

**Avant mise en production :**

- [ ] Générer les icônes PWA (`public/icons/icon-192.png`, `icon-512.png`)
- [ ] Middleware JWT Supabase backend (extraire `user_id` du token)
- [ ] Rate limiting `slowapi` (10 req/min `/correct`, 5 req/min `/upload`)
- [ ] Upload asynchrone — job queue + polling (éviter timeout mobile)
- [ ] Endpoint `POST /api/feedback` + migration 004 `correction_feedback`
- [ ] Tests E2E Playwright (flux upload + flux correction)
- [ ] Déploiement (Vercel + Railway/Render + Supabase prod)

### Phase 2 — Croissance

- [ ] Mode socratique complet (indices progressifs avant réponse)
- [ ] Reranking des chunks RAG avant injection spécialiste
- [ ] Rendu formules chimiques (`mhchem` KaTeX)
- [ ] Paiement Stripe (freemium : 10 corrections/mois gratuit, Premium illimité 9,99€)
- [ ] Quotas d'utilisation liés au plan (gating features)
- [ ] Google OAuth
- [ ] Monitoring général (Sentry erreurs + Posthog comportement)
- [ ] Dashboard coûts IA (alertes si dépassement seuil journalier)
- [ ] Multi-photos pour un même cours (uploader plusieurs pages)
- [ ] Rapport hebdomadaire parents (email résumant matières + progrès)
- [ ] Gamification légère (streak quotidien, badges par matière)

### Phase 3 — Scale & Partenariats

- [ ] App native iOS/Android via Capacitor
- [ ] Compte enseignant : upload de cours partagé avec une classe entière (modèle type Ecole Direct)
- [ ] Partenariats établissements scolaires (cours du prof directement dans StudyBuddy)
- [ ] Mode révision : génération de QCM/questions depuis les cours uploadés
- [ ] Fiches de révision auto-générées (résumé structuré du chapitre)
- [ ] Mémoire longitudinale : l'agent se souvient des erreurs récurrentes de l'élève
- [ ] Détection des lacunes par chapitre (analytics pédagogiques)
- [ ] Support LV2 (Espagnol, Allemand, Italien)
- [ ] Support matières pro (BTS, BUT, CPGE)
