# Evestime Continuation Handoff

Date: 2026-04-07

## Objective
Stabilize production authentication on Vercel first, then continue with page-level fixes.

## Reference Websites
1. Primary design and UX reference: `https://www.moneylion.com/`
   - Use this as a benchmark for page structure, conversion-focused sections, trust messaging, and responsive behavior during the upcoming page repair and redesign phase.

## What Was Implemented
1. Added protected production diagnostics endpoint:
   - `GET /api/auth/diagnostics`
   - Requires `x-auth-diagnostics-token` in production.
   - Returns non-secret health booleans for auth secret, DB env, DB reachability, table reachability, and stage hint.
2. Added auth diagnostics helper:
   - `lib/auth-diagnostics.ts`
3. Hardened dashboard behavior:
   - `app/dashboard/page.tsx` now tolerates missing `accounts`/`transactions` tables and avoids masking auth with hard failures.
4. Created and improved automated recovery/audit script:
   - `scripts/run-prod-auth-recovery-and-audit.sh`
   - Pulls production envs, resets/admin-roles target account, checks diagnostics, tests live login, checks dashboard/admin API, and runs fallback page/API sweep.
5. Increased DB request timeout:
   - `lib/db.ts` timeout moved from `30000` to `45000` ms.

## Production Findings (Verified)
1. Auth env and DB env are configured in production.
2. Login failures were narrowed to two states across runs:
   - `credentials_or_user_data`
   - intermittent `service_unavailable` due to DB timeout
3. The target admin user was upserted:
   - email: `sabi@demosite`
   - role: `admin`
4. Final successful verification run produced:
   - login callback returned `302` with `__Secure-authjs.session-token`
   - `/dashboard` returned `200`
   - `/api/admin/leads?page=1&pageSize=1` returned `200`

## Commands Used for Verification
Run from repo root:

```bash
bash scripts/run-prod-auth-recovery-and-audit.sh
```

Manual diagnostics check:

```bash
curl -sS https://evestime.vercel.app/api/auth/diagnostics \
  -H "x-auth-diagnostics-token: <AUTH_DIAGNOSTICS_TOKEN>" | python3 -m json.tool
```

## Current Known Issues
1. Production DB connectivity appears intermittently unstable from Vercel functions.
   - Symptom: `CredentialsSignin&code=service_unavailable`
   - Symptom: diagnostics may return DB timeout in degraded periods.
2. Public pages are not all implemented even though related APIs exist:
   - `/offers` -> `404`
   - `/coin-assets` -> `404`
3. Some API endpoints are healthy:
   - `/api/offers` -> `200` or `500` during DB instability
   - `/api/coin-assets` -> `200` or `500` during DB instability

## Next Prioritized Steps
1. Keep auth stable first:
   - rerun `scripts/run-prod-auth-recovery-and-audit.sh` multiple times to measure timeout frequency.
   - inspect Vercel error logs during failure windows.
2. If DB instability persists:
   - evaluate Neon/Vercel region affinity and pooling behavior.
   - consider fallback/retry patterns for critical auth query path.
3. After auth stability:
   - add missing public pages for `/offers` and `/coin-assets` consuming existing APIs.
   - then continue broader page repair against the MoneyLion reference site.

## Files Touched in This Phase
1. `app/api/auth/diagnostics/route.ts`
2. `lib/auth-diagnostics.ts`
3. `app/dashboard/page.tsx`
4. `scripts/run-prod-auth-recovery-and-audit.sh`
5. `lib/db.ts`
6. `.gitignore`

## Safety Notes
1. `.vercel-check/` now ignored in git because it contains pulled env material.
2. No secrets are stored in this document.
