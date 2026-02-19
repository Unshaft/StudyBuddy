-- ============================================================
-- StudyBuddy — Migration initiale
-- Prérequis : extension pgvector activée dans Supabase
-- ============================================================

-- Active l'extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- TABLE : courses
-- Stocke les cours uploadés par les élèves
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    title       TEXT NOT NULL DEFAULT 'Sans titre',
    subject     TEXT NOT NULL DEFAULT 'Inconnu',
    level       TEXT NOT NULL DEFAULT 'Inconnu',
    keywords    TEXT[] DEFAULT '{}',
    raw_content TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les requêtes par utilisateur
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_subject  ON courses(user_id, subject);

-- ============================================================
-- TABLE : course_chunks
-- Chunks vectorisés des cours (pgvector)
-- ============================================================
CREATE TABLE IF NOT EXISTS course_chunks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL,
    content     TEXT NOT NULL,
    embedding   VECTOR(1024),        -- text-embedding-3-small = 1024 dims
    chunk_index INTEGER NOT NULL,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index classique
CREATE INDEX IF NOT EXISTS idx_chunks_course_id ON course_chunks(course_id);
CREATE INDEX IF NOT EXISTS idx_chunks_user_id   ON course_chunks(user_id);

-- Index vectoriel (HNSW pour la recherche ANN — plus rapide que IVFFlat)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding
    ON course_chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ============================================================
-- FONCTION RPC : search_course_chunks
-- Recherche vectorielle avec filtrage par user et matière
-- ============================================================
CREATE OR REPLACE FUNCTION search_course_chunks(
    query_embedding  VECTOR(1024),
    user_id_filter   UUID,
    match_count      INTEGER DEFAULT 5,
    subject_filter   TEXT    DEFAULT NULL,
    similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    id           UUID,
    course_id    UUID,
    course_title TEXT,
    subject      TEXT,
    content      TEXT,
    chunk_index  INTEGER,
    similarity   FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cc.id,
        cc.course_id,
        c.title  AS course_title,
        c.subject,
        cc.content,
        cc.chunk_index,
        1 - (cc.embedding <=> query_embedding) AS similarity
    FROM course_chunks cc
    JOIN courses c ON c.id = cc.course_id
    WHERE
        cc.user_id = user_id_filter
        AND (subject_filter IS NULL OR c.subject ILIKE '%' || subject_filter || '%')
        AND 1 - (cc.embedding <=> query_embedding) > similarity_threshold
    ORDER BY cc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Chaque utilisateur ne voit que ses propres données
-- ============================================================
ALTER TABLE courses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_chunks ENABLE ROW LEVEL SECURITY;

-- Politique pour courses : un utilisateur accède uniquement à ses cours
CREATE POLICY "users_own_courses"
    ON courses FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Politique pour course_chunks : un utilisateur accède uniquement à ses chunks
CREATE POLICY "users_own_chunks"
    ON course_chunks FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Note : le service_role_key bypass le RLS (utilisé côté backend FastAPI)
-- Le anon_key respecte le RLS (utilisé côté frontend)
