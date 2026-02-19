# StudyBuddy

> Aide aux devoirs pour collégiens et lycéens — l'IA corrige en citant le cours de l'élève.

L'élève prend son cours en photo → le contenu est vectorisé → en mode exercice, il prend son énoncé en photo → un agent IA le guide pas-à-pas en s'appuyant exclusivement sur **son propre cours**.

---

## Comment ça marche

```text
📸 Photo du cours  →  OCR (Claude Vision)  →  Chunks vectorisés (pgvector)
📸 Photo exercice  →  OCR  →  RAG  →  Spécialiste IA  →  Correction guidée
```

Le différenciateur : la correction est ancrée dans le cours personnel de l'élève, pas dans une base de connaissances générique.

---

## Stack

| Couche | Technologie |
| --- | --- |
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui |
| Backend | FastAPI (Python) · LangGraph |
| Auth + DB | Supabase (Auth · PostgreSQL · pgvector · Storage) |
| LLM | Claude claude-sonnet-4-6 (OCR + correction) · Claude Haiku (évaluation) |
| Embeddings | OpenAI text-embedding-3-small (1536d) |
| Déploiement | Vercel (front) · Railway (back) |

---

## Démarrage rapide

### Prérequis

- Node.js 18+
- Python 3.11+
- Compte [Supabase](https://supabase.com) avec pgvector activé
- Clé API [Anthropic](https://console.anthropic.com)
- Clé API [OpenAI](https://platform.openai.com)

### 1. Cloner le repo

```bash
git clone https://github.com/votre-compte/studybuddy.git
cd studybuddy
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows : venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Remplir les variables dans .env (voir section Variables d'environnement)

uvicorn main:app --reload
# API disponible sur http://localhost:8000
# Docs Swagger : http://localhost:8000/docs
```

### 3. Base de données

```bash
# Appliquer les migrations sur votre projet Supabase
supabase login
supabase link --project-ref <votre-project-ref>
supabase db push
```

### 4. Frontend

```bash
cd frontend
npm install

cp .env.local.example .env.local
# Remplir les variables dans .env.local

npm run dev
# App disponible sur http://localhost:3000
```

---

## Variables d'environnement

### `backend/.env`

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

CORS_ORIGINS=http://localhost:3000
ENVIRONMENT=development
```

### `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Architecture

### Backend — pipeline de correction

```text
POST /api/exercice/correct/stream  (SSE)

image  →  ocr_node
       →  orchestrator_node       (routing matière + niveau)
       →  rag_retrieval_node      (recherche vectorielle dans les cours)
       →  specialist_node         (1 parmi 7 spécialistes selon la matière)
       →  [rag_requery si besoin] (jusqu'à 2 itérations)
       →  evaluator_node          (Claude Haiku évalue la qualité)
       →  output_node             →  tokens streamés vers le frontend
```

**7 spécialistes :** Mathématiques · Français · Physique-Chimie · SVT · Histoire-Géo · Anglais · Philosophie

**Niveaux :** 6ème → Terminale

### Structure des dossiers

```text
studybuddy/
├── frontend/          # Next.js PWA mobile-first
│   ├── app/           # App Router (auth, cours, exercice, historique)
│   ├── components/    # UI components (CourseUploader, CorrectionStream, MathRenderer…)
│   ├── store/         # Zustand (auth, cours, historique IndexedDB)
│   └── hooks/         # useCamera, useCorrectionStream, useHistory
├── backend/           # FastAPI
│   ├── api/           # Routes HTTP (cours, exercice, feedback)
│   ├── rag/           # OCR, chunking sémantique, embeddings, retrieval
│   ├── agents/        # Graphe LangGraph + 7 spécialistes + noeuds
│   └── db/            # Client Supabase (service_role)
└── supabase/
    └── migrations/    # SQL : pgvector, RLS, chapters, agent_sessions
```

---

## API — endpoints principaux

| Méthode | Route | Description |
| --- | --- | --- |
| `POST` | `/api/cours/upload` | Upload photo cours → OCR → vectorisation |
| `GET` | `/api/cours/` | Liste des cours d'un utilisateur |
| `DELETE` | `/api/cours/{id}` | Supprime un cours et ses chunks |
| `POST` | `/api/exercice/correct` | Correction complète (JSON) |
| `POST` | `/api/exercice/correct/stream` | Correction en streaming SSE |
| `POST` | `/api/feedback` | Retour 👍/👎 sur une correction |
| `GET` | `/health` | Health check |

---

## Roadmap

### MVP — en cours

- [x] Backend FastAPI + pipeline RAG (OCR → chunking → pgvector)
- [x] Graphe LangGraph multi-agent (7 spécialistes)
- [x] Streaming SSE (phases + tokens temps réel)
- [ ] Frontend Next.js (auth, cours, exercice, historique local)
- [ ] Rate limiting + middleware JWT
- [ ] Déploiement Vercel + Railway

### Phase 2

- [ ] Mode socratique (indices progressifs, pas de réponse directe)
- [ ] Rendu LaTeX KaTeX dans les corrections
- [ ] Chapitres (regroupement de cours, RAG cross-documents)
- [ ] Paiement Stripe (freemium 10 corrections/mois)
- [ ] Monitoring Sentry + alertes coûts IA

### Phase 3

- [ ] App native iOS/Android (Capacitor)
- [ ] Compte enseignant + partenariats établissements
- [ ] Fiches de révision auto-générées
- [ ] Mémoire longitudinale (erreurs récurrentes par élève)

---

## Contribuer

Ce projet suit les [Conventional Commits](https://www.conventionalcommits.org/fr/) :

```bash
feat: ajouter le rendu LaTeX dans CorrectionStream
fix: corriger le timeout sur l'upload de cours HEIC
chore: mettre à jour les dépendances Python
```

Pour toute décision d'architecture, voir [CLAUDE.md](CLAUDE.md) — c'est la source de vérité du projet.

---

## Licence

MIT
