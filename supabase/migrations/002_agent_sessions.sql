-- ============================================================
-- StudyBuddy — Migration 002 : sessions d'agent pour l'audit
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_sessions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL,
    subject          TEXT NOT NULL,
    level            TEXT NOT NULL,
    exercise_type    TEXT,
    specialist_used  TEXT,
    rag_iterations   INTEGER DEFAULT 0,
    evaluation_score FLOAT,
    chunks_found     INTEGER DEFAULT 0,
    needs_revision   BOOLEAN DEFAULT FALSE,
    duration_ms      INTEGER,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_subject  ON agent_sessions(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_sessions_created  ON agent_sessions(created_at DESC);

ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_sessions"
    ON agent_sessions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
