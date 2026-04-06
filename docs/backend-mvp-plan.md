# Backend MVP Plan

## Current Repo Assessment

- Runtime and framework:
  - Next.js `16.2.2`
  - React `19.2.4`
  - TypeScript `^5`
  - NextAuth `5.0.0-beta.30`
  - Neon serverless driver `@neondatabase/serverless`
- Backend shape today:
  - Monolithic Next.js app-router app with route handlers under `app/api/`
  - Auth wired through `auth.ts` with a credentials provider
  - Direct SQL access through `lib/db.ts` using the Neon tagged-template client
  - No ORM, migration runner, queue, background worker, or shared service layer yet
  - No RBAC, audit log, validation library, webhook verification, or rate limiting yet
- Files inspected:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `package.json`
  - `auth.ts`
  - `lib/db.ts`
  - `lib/env.ts`
  - `app/api/auth/[...nextauth]/route.ts`
  - `app/api/auth/signup/route.ts`
  - `app/api/dev/seed-demo/route.ts`
  - `app/api/test-db/route.ts`
  - `app/dashboard/page.tsx`
  - `src/app/api/debug-user/route.ts`
  - `README.md`
  - `.github/workflows/neon_workflow.yml`
- Constraints:
  - `AGENTS.md` is explicit that this is not legacy Next.js and local Next 16 docs must be checked before backend edits.
  - The current repo convention is low-dependency TypeScript with direct SQL and route handlers.
  - There is no existing migration framework in `package.json`.

## Recommended Backend Direction

- Keep inside Next.js for MVP:
  - public lead capture APIs
  - Telegram webhook ingestion
  - admin CRUD APIs
  - support handoff logging
  - authenticated dashboard and admin pages
  - server-side qualification session retrieval
- Extract into local modules under `lib/`:
  - request validation and parsing
  - lead orchestration
  - offer catalog read/write logic
  - support routing policy
  - audit logging
  - authz helpers and RBAC checks
  - webhook signature verification
- Do not build yet:
  - trading engine or wallet ledger
  - exchange-style order books
  - real-time pricing infra
  - event bus / separate worker service
  - multi-provider workflow orchestration engine

## Backend Domains

- Auth
  - Credentials login is already present.
  - Add user roles, admin authorization checks, and session claims next.
- Users
  - Keep the existing `users` table as the identity anchor.
  - Add profile and compliance metadata incrementally.
- Leads
  - Core MVP domain.
  - Track product interest, qualification state, routing status, and ownership.
- Investment offers
  - Admin-managed catalog for Core Investing and Pro Opportunities.
- Portfolios
  - Marketing and informational portfolio snapshots, not a trading ledger.
- Coin assets
  - Metadata catalog for BTC, ETH, stablecoins, and supported exposure types.
- Pro opportunities
  - Separate offer class with stricter gating, warnings, and acknowledgement requirements.
- Support routing
  - Deterministic routing decisions with destination type, destination handle, and status.
- Telegram bot sessions
  - Store bot identity, session state, answers, and qualification outcomes.
- WhatsApp handoff
  - Log outbound routing, operator assignment, and acknowledgement state.
- Email workflows
  - Use email as a fallback or advisor-assigned channel, with templates later.
- Admin operations
  - Offer management, lead review, routing overrides, advisor assignment, and content ops.
- Compliance and audit logs
  - Immutable actor/action trail across user, bot, and admin actions.
- Analytics events
  - Store high-signal backend events for funnel analysis and ops visibility.

## Database Design

### Existing base

- `users`
  - Existing auth table used by `auth.ts`
  - Keep as the source of authenticated admin or staff identities

### Proposed MVP tables

- `user_roles`
  - `id uuid primary key`
  - `user_id text not null`
  - `role text not null`
  - `scope text null`
  - `created_at timestamptz not null default now()`
  - Unique: `(user_id, role, coalesce(scope, 'global'))`
  - Indexes: `(user_id)`, `(role)`
- `offers`
  - `id uuid primary key`
  - `slug text not null unique`
  - `name text not null`
  - `category text not null`
  - `risk_level text not null`
  - `status text not null`
  - `headline text not null`
  - `summary text not null`
  - `min_interest_amount numeric(18,2) null`
  - `currency text not null default 'USD'`
  - `is_pro boolean not null default false`
  - `metadata jsonb not null default '{}'::jsonb`
  - `created_by text null`
  - `updated_by text null`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - Indexes: `(status)`, `(category, status)`, `(is_pro, status)`
- `coin_assets`
  - `id uuid primary key`
  - `symbol text not null unique`
  - `name text not null`
  - `network text null`
  - `is_active boolean not null default true`
  - `metadata jsonb not null default '{}'::jsonb`
  - `created_at timestamptz not null default now()`
- `offer_assets`
  - `offer_id uuid not null references offers(id)`
  - `coin_asset_id uuid not null references coin_assets(id)`
  - `allocation_note text null`
  - Primary key: `(offer_id, coin_asset_id)`
- `leads`
  - `id uuid primary key`
  - `email text null`
  - `full_name text null`
  - `phone text null`
  - `telegram_username text null`
  - `country_code text null`
  - `source text not null`
  - `status text not null`
  - `qualification_status text not null`
  - `risk_appetite text null`
  - `interest_amount numeric(18,2) null`
  - `currency text not null default 'USD'`
  - `notes text null`
  - `latest_session_id uuid null`
  - `assigned_user_id text null`
  - `last_contact_channel text null`
  - `spam_score integer not null default 0`
  - `metadata jsonb not null default '{}'::jsonb`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - `deleted_at timestamptz null`
  - Indexes: `(status, created_at desc)`, `(qualification_status)`, `(assigned_user_id)`, `(email)`, `(telegram_username)`
  - Partial uniqueness for dedupe:
    - unique index on `lower(email)` where `deleted_at is null and email is not null`
- `lead_interests`
  - `id uuid primary key`
  - `lead_id uuid not null references leads(id)`
  - `offer_id uuid null references offers(id)`
  - `portfolio_slug text null`
  - `interest_type text not null`
  - `interest_notes text null`
  - `intent_strength text null`
  - `created_at timestamptz not null default now()`
  - Indexes: `(lead_id, created_at desc)`, `(offer_id)`
- `qualification_sessions`
  - `id uuid primary key`
  - `lead_id uuid not null references leads(id)`
  - `channel text not null`
  - `status text not null`
  - `started_at timestamptz not null default now()`
  - `completed_at timestamptz null`
  - `result text null`
  - `bot_session_key text not null unique`
  - `summary jsonb not null default '{}'::jsonb`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - Indexes: `(lead_id, started_at desc)`, `(status)`, `(channel, status)`
- `qualification_answers`
  - `id uuid primary key`
  - `qualification_session_id uuid not null references qualification_sessions(id)`
  - `question_key text not null`
  - `question_text text not null`
  - `answer_value text not null`
  - `answer_json jsonb null`
  - `created_at timestamptz not null default now()`
  - Unique: `(qualification_session_id, question_key)`
- `support_handoffs`
  - `id uuid primary key`
  - `lead_id uuid not null references leads(id)`
  - `qualification_session_id uuid null references qualification_sessions(id)`
  - `destination_channel text not null`
  - `destination_handle text not null`
  - `routing_reason text not null`
  - `status text not null`
  - `assigned_user_id text null`
  - `external_reference text null`
  - `created_at timestamptz not null default now()`
  - `acknowledged_at timestamptz null`
  - Indexes: `(lead_id, created_at desc)`, `(status)`, `(destination_channel)`
- `compliance_acknowledgements`
  - `id uuid primary key`
  - `lead_id uuid not null references leads(id)`
  - `offer_id uuid null references offers(id)`
  - `ack_type text not null`
  - `ack_version text not null`
  - `accepted boolean not null`
  - `accepted_at timestamptz not null default now()`
  - `ip_hash text null`
  - `user_agent text null`
  - `created_at timestamptz not null default now()`
  - Unique: `(lead_id, offer_id, ack_type, ack_version)`
- `audit_logs`
  - `id uuid primary key`
  - `actor_type text not null`
  - `actor_id text null`
  - `entity_type text not null`
  - `entity_id text not null`
  - `action text not null`
  - `request_id text null`
  - `ip_hash text null`
  - `metadata jsonb not null default '{}'::jsonb`
  - `created_at timestamptz not null default now()`
  - Indexes: `(entity_type, entity_id, created_at desc)`, `(actor_type, actor_id, created_at desc)`, `(action, created_at desc)`
- `analytics_events`
  - `id uuid primary key`
  - `event_name text not null`
  - `lead_id uuid null references leads(id)`
  - `offer_id uuid null references offers(id)`
  - `session_key text null`
  - `event_time timestamptz not null default now()`
  - `properties jsonb not null default '{}'::jsonb`
  - Indexes: `(event_name, event_time desc)`, `(lead_id, event_time desc)`

## API Design

- `POST /api/leads`
  - Purpose: create or update a lead from public forms
  - Request:
    - `fullName?: string`
    - `email?: string`
    - `phone?: string`
    - `telegramUsername?: string`
    - `countryCode?: string`
    - `source: 'landing_page' | 'offer_page' | 'portfolio_page' | 'support_hub'`
    - `interestAmount?: number`
    - `currency?: string`
    - `notes?: string`
    - `offerSlug?: string`
    - `portfolioSlug?: string`
    - `complianceAcknowledgements?: Array<{ type: string; version: string; accepted: boolean }>`
  - Response:
    - `201 { leadId: string; status: string; qualificationStatus: string }`
  - Auth:
    - public
- `POST /api/interests`
  - Purpose: attach a product interest to an existing or newly created lead
  - Request:
    - `leadId?: string`
    - `email?: string`
    - `offerSlug?: string`
    - `portfolioSlug?: string`
    - `interestType: string`
    - `interestNotes?: string`
  - Response:
    - `201 { interestId: string; leadId: string }`
  - Auth:
    - public
- `POST /api/webhooks/telegram`
  - Purpose: ingest Telegram bot updates
  - Request:
    - Telegram update payload
  - Response:
    - `200 { ok: true }`
  - Auth:
    - verified webhook secret
- `GET /api/qualification-sessions/:id`
  - Purpose: retrieve session details for staff tools
  - Response:
    - `200 { session, answers, lead }`
  - Auth:
    - admin or advisor
- `PATCH /api/qualification-sessions/:id`
  - Purpose: update session result, notes, or resolution
  - Request:
    - `status?: string`
    - `result?: string`
    - `summary?: Record<string, unknown>`
  - Response:
    - `200 { session }`
  - Auth:
    - admin or advisor
- `POST /api/leads/:id/assign-advisor`
  - Purpose: assign a lead to an operator or advisor
  - Request:
    - `userId: string`
    - `reason?: string`
  - Response:
    - `200 { leadId: string; assignedUserId: string }`
  - Auth:
    - admin
- `POST /api/support-handoffs`
  - Purpose: record WhatsApp or email routing
  - Request:
    - `leadId: string`
    - `qualificationSessionId?: string`
    - `destinationChannel: 'whatsapp' | 'email'`
    - `destinationHandle: string`
    - `routingReason: string`
  - Response:
    - `201 { handoffId: string; status: string }`
  - Auth:
    - system, admin, or advisor
- `GET /api/admin/offers`
  - Purpose: list offers
  - Response:
    - `200 { items: Offer[] }`
  - Auth:
    - admin
- `POST /api/admin/offers`
  - Purpose: create an offer
  - Request:
    - offer payload
  - Response:
    - `201 { offer }`
  - Auth:
    - admin
- `PATCH /api/admin/offers/:id`
  - Purpose: update an offer
  - Response:
    - `200 { offer }`
  - Auth:
    - admin
- `GET /api/admin/leads`
  - Purpose: queue and search leads
  - Response:
    - `200 { items: Lead[]; nextCursor?: string }`
  - Auth:
    - admin or advisor
- `PATCH /api/admin/leads/:id`
  - Purpose: update lead status and notes
  - Request:
    - `status?: string`
    - `qualificationStatus?: string`
    - `notes?: string`
  - Response:
    - `200 { lead }`
  - Auth:
    - admin or advisor
- `POST /api/compliance/acknowledgements`
  - Purpose: capture high-risk disclaimers and suitability acknowledgements
  - Request:
    - `leadId: string`
    - `offerId?: string`
    - `ackType: string`
    - `ackVersion: string`
    - `accepted: boolean`
  - Response:
    - `201 { acknowledgementId: string }`
  - Auth:
    - public or authenticated depending on flow

## Core Workflows

1. User views offer and submits interest
   - Public form calls `POST /api/leads`
   - API validates input, de-dupes by email or Telegram identity, creates lead and lead interest, records audit event
2. User starts Telegram qualification
   - UI or follow-up message creates a `qualification_sessions` row
   - Telegram webhook maps bot updates to the active session
3. Bot collects answers
   - Each answer upserts into `qualification_answers`
   - Session summary is updated as structured JSON
   - Qualification result becomes `qualified`, `needs_review`, or `rejected`
4. User is routed to WhatsApp or email
   - Routing service chooses destination by product type, geography, and advisor availability
   - `support_handoffs` row is inserted
   - Audit event is captured
5. Advisor sees full lead context
   - Admin UI fetches lead, interests, qualification summary, acknowledgements, and handoff history
6. Admin updates lead status
   - Admin route updates lead state and assignment
   - Every mutation emits an audit record
7. Compliance and audit events are recorded
   - Public acknowledgements, bot decisions, admin overrides, and routing actions write to `audit_logs`

## Security And Compliance

- Input validation
  - Validate every public request body server-side with strict allowlists and length caps.
- Authz and RBAC
  - Add role checks before any admin, advisor, or content mutation route.
- Secrets and env safety
  - Stop committing live credentials.
  - Move to `.env.local` only and provide `.env.example`.
- Rate limiting
  - Apply IP and identity-based throttling on public lead and webhook endpoints.
- Webhook verification
  - Verify Telegram secret token before processing updates.
- Spam prevention
  - Add honeypot fields, request fingerprinting, and lightweight duplicate detection.
- Audit logging
  - Make audit writes part of every privileged mutation path.
- Suitability acknowledgements
  - Require explicit acceptance before Pro Opportunities routing.
- High-risk product warnings
  - Keep Pro offers behind separate copy, warning flags, and extra acknowledgement versions.
- PII handling
  - Avoid logging raw payloads.
  - Hash IPs.
  - Keep notes and lead metadata scoped and reviewable.

## Implementation Plan

1. Harden the current backend surface
   - remove or gate debug endpoints
   - fix current server-side data access issues
   - centralize request validation helpers
2. Establish persistence primitives
   - add SQL migration files for leads, offers, audit logs, and qualification sessions
   - add a repeatable migration command later
3. Build lead capture
   - `POST /api/leads`
   - lead dedupe
   - compliance acknowledgement capture
4. Build admin read paths
   - lead listing
   - lead detail
   - status updates
5. Build Telegram ingestion
   - webhook verification
   - qualification session updates
6. Build support routing
   - WhatsApp and email handoff logging
   - advisor assignment
7. Add operational controls
   - RBAC
   - rate limiting
   - structured audit coverage

## Safest First Task

- First implementation task:
  - harden the current backend surface before adding crypto-specific flows
- Why:
  - there is already a server-side bug in `app/dashboard/page.tsx`
  - there are public diagnostic-style routes that are not appropriate for a production-facing financial product
  - fixing those issues reduces risk without changing the auth flow or requiring schema changes
