CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS user_roles_user_idx
  ON user_roles (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_roles_role_idx
  ON user_roles (role, created_at DESC);

ALTER TABLE support_handoffs
  ADD COLUMN IF NOT EXISTS qualification_session_id UUID REFERENCES qualification_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS support_handoffs_session_created_idx
  ON support_handoffs (qualification_session_id, created_at DESC);
