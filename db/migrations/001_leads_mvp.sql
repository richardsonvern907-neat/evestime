CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  full_name TEXT,
  email TEXT,
  phone TEXT,
  telegram_username TEXT,
  whatsapp_phone TEXT,
  source_channel TEXT NOT NULL,
  source_page TEXT NOT NULL,
  campaign_source TEXT,
  campaign_medium TEXT,
  campaign_name TEXT,
  product_type TEXT NOT NULL,
  product_id TEXT,
  product_slug TEXT,
  interest_type TEXT NOT NULL,
  lead_status TEXT NOT NULL DEFAULT 'new',
  risk_segment TEXT,
  assigned_advisor_id TEXT,
  last_contacted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status_created_at_idx ON leads (lead_status, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_product_idx ON leads (product_type, product_slug);
CREATE INDEX IF NOT EXISTS leads_source_idx ON leads (source_channel, source_page);
CREATE INDEX IF NOT EXISTS leads_email_idx ON leads (email);
CREATE INDEX IF NOT EXISTS leads_assigned_advisor_idx ON leads (assigned_advisor_id);

CREATE TABLE IF NOT EXISTS qualification_sessions (
  id UUID PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  external_session_id TEXT NOT NULL UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  current_step TEXT NOT NULL DEFAULT 'product_interest',
  status TEXT NOT NULL DEFAULT 'pending',
  route_decision TEXT,
  suitability_required BOOLEAN NOT NULL DEFAULT FALSE,
  suitability_completed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  telegram_user_id TEXT,
  telegram_chat_id TEXT,
  last_event_id TEXT
);

CREATE INDEX IF NOT EXISTS qualification_sessions_lead_started_idx
  ON qualification_sessions (lead_id, started_at DESC);
CREATE INDEX IF NOT EXISTS qualification_sessions_status_idx
  ON qualification_sessions (status, started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS qualification_sessions_active_channel_idx
  ON qualification_sessions (lead_id, channel)
  WHERE status IN ('pending', 'in_progress');

CREATE TABLE IF NOT EXISTS qualification_answers (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES qualification_sessions(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_value TEXT NOT NULL,
  answer_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, question_key)
);

CREATE INDEX IF NOT EXISTS qualification_answers_session_created_idx
  ON qualification_answers (session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_handoffs (
  id UUID PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  destination TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  handoff_status TEXT NOT NULL DEFAULT 'pending',
  handoff_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS support_handoffs_lead_created_idx
  ON support_handoffs (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS support_handoffs_status_idx
  ON support_handoffs (handoff_status, created_at DESC);

CREATE TABLE IF NOT EXISTS suitability_acknowledgements (
  id UUID PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  qualification_session_id UUID REFERENCES qualification_sessions(id) ON DELETE SET NULL,
  acknowledgement_key TEXT NOT NULL,
  accepted BOOLEAN NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lead_id, acknowledgement_key)
);

CREATE INDEX IF NOT EXISTS suitability_acknowledgements_lead_idx
  ON suitability_acknowledgements (lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx
  ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_event_idx
  ON audit_logs (event_name, created_at DESC);
