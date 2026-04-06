CREATE TABLE IF NOT EXISTS lead_notes (
  id UUID PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL,
  note_body TEXT NOT NULL,
  note_type TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lead_notes_lead_created_idx
  ON lead_notes (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_notes_author_created_idx
  ON lead_notes (author_user_id, created_at DESC);
