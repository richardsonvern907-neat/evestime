CREATE TABLE IF NOT EXISTS coin_assets (
  id UUID PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  chain_name TEXT,
  logo_url TEXT,
  website_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  market_data_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coin_assets_active_idx
  ON coin_assets (is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY,
  offer_type TEXT NOT NULL,
  product_track TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  risk_level TEXT,
  min_investment_amount NUMERIC(18,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  expected_return_text TEXT,
  term_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  suitability_required BOOLEAN NOT NULL DEFAULT FALSE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  hero_image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  created_by_user_id TEXT NOT NULL,
  reviewed_by_user_id TEXT,
  published_by_user_id TEXT,
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS offers_track_status_featured_sort_idx
  ON offers (product_track, status, featured, sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS offers_status_updated_idx
  ON offers (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS offer_assets (
  id UUID PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  coin_asset_id UUID NOT NULL REFERENCES coin_assets(id) ON DELETE RESTRICT,
  allocation_percent NUMERIC(7,4),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (offer_id, coin_asset_id)
);

CREATE INDEX IF NOT EXISTS offer_assets_offer_display_idx
  ON offer_assets (offer_id, display_order ASC, created_at ASC);

CREATE TABLE IF NOT EXISTS compliance_acknowledgement_templates (
  id UUID PRIMARY KEY,
  acknowledgement_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body_text TEXT NOT NULL,
  applies_to_product_track TEXT,
  applies_to_offer_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS compliance_templates_active_idx
  ON compliance_acknowledgement_templates (is_active, created_at DESC);
