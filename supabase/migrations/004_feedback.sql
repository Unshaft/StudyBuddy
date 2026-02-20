-- Migration 004 : correction_feedback
-- Stocke les retours 👍/👎 des élèves sur chaque correction.

CREATE TABLE IF NOT EXISTS correction_feedback (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID,                                              -- réf. agent_sessions (soft FK)
    user_id     UUID        REFERENCES auth.users ON DELETE CASCADE,
    rating      SMALLINT    NOT NULL CHECK (rating IN (1, -1)),   -- 1 = 👍, -1 = 👎
    comment     TEXT,                                             -- commentaire libre (optionnel)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour requêtes par session ou par user
CREATE INDEX IF NOT EXISTS correction_feedback_session_id_idx ON correction_feedback (session_id);
CREATE INDEX IF NOT EXISTS correction_feedback_user_id_idx    ON correction_feedback (user_id);

-- Row Level Security
ALTER TABLE correction_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own feedback"
    ON correction_feedback
    FOR ALL
    USING     (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
