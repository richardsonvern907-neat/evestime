#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_DIR="$ROOT_DIR/.vercel-check"
ENV_FILE="$ENV_DIR/evestime.production.env"
COOKIE_JAR="/tmp/evestime-login-cookies.txt"
LOGIN_HEADERS="/tmp/evestime-login-headers.txt"
LOGIN_BODY="/tmp/evestime-login-body.txt"
AUDIT_OUTPUT="/tmp/evestime-auth-diagnostics.json"

EMAIL="sabi@demosite"
PASSWORD="moronto"
NAME="Admin"
SITE_URL="https://evestime.vercel.app"

mkdir -p "$ENV_DIR"

retry() {
  local attempts="$1"
  local wait_seconds="$2"
  shift 2

  local attempt=1
  until "$@"; do
    if (( attempt >= attempts )); then
      return 1
    fi
    sleep "$wait_seconds"
    ((attempt+=1))
  done
}

echo "==> Pulling latest Vercel production environment"
vercel env pull "$ENV_FILE" --environment=production >/dev/null

DATABASE_URL="$(python3 - <<'PY' "$ENV_FILE"
from pathlib import Path
import sys

path = Path(sys.argv[1])
for line in path.read_text().splitlines():
    if line.startswith("DATABASE_URL="):
        print(line.split("=", 1)[1].strip().strip('"'))
        break
else:
    raise SystemExit("DATABASE_URL not found in pulled production env file")
PY
)"

AUTH_DIAGNOSTICS_TOKEN="$(python3 - <<'PY' "$ENV_FILE"
from pathlib import Path
import sys

path = Path(sys.argv[1])
for line in path.read_text().splitlines():
    if line.startswith("AUTH_DIAGNOSTICS_TOKEN="):
        print(line.split("=", 1)[1].strip().strip('"'))
        break
else:
    raise SystemExit("AUTH_DIAGNOSTICS_TOKEN not found in pulled production env file")
PY
)"

PASSWORD_HASH="$(cd "$ROOT_DIR" && node -e "const bcrypt=require('bcryptjs'); bcrypt.hash(process.argv[1],10).then(v=>console.log(v));" "$PASSWORD")"
ROLE_ID="$(cd "$ROOT_DIR" && node -e "console.log(require('crypto').randomUUID())")"

echo "==> Writing admin account and role in production database"
psql "$DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -v email="$EMAIL" \
  -v password_hash="$PASSWORD_HASH" \
  -v name="$NAME" \
  -v role_id="$ROLE_ID" <<'SQL'
INSERT INTO users (email, password, name)
VALUES (:'email', :'password_hash', :'name')
ON CONFLICT (email)
DO UPDATE SET
  password = EXCLUDED.password,
  name = COALESCE(users.name, EXCLUDED.name);

INSERT INTO user_roles (id, user_id, role)
SELECT :'role_id', id::text, 'admin'
FROM users
WHERE email = :'email'
ON CONFLICT (user_id, role) DO NOTHING;

SELECT u.id::text AS user_id, u.email, array_remove(array_agg(ur.role), NULL) AS roles
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id::text
WHERE u.email = :'email'
GROUP BY u.id, u.email;
SQL

echo
echo "==> Checking production auth diagnostics"
retry 3 2 curl -sS "$SITE_URL/api/auth/diagnostics" \
  -H "x-auth-diagnostics-token: $AUTH_DIAGNOSTICS_TOKEN" | tee "$AUDIT_OUTPUT"

echo
echo "==> Logging in with the production admin account"
login_succeeded=false
for attempt in 1 2 3 4; do
  rm -f "$COOKIE_JAR"
  csrf_json="$(curl -sS -c "$COOKIE_JAR" "$SITE_URL/api/auth/csrf")"
  csrf_token="$(printf '%s' "$csrf_json" | sed -n 's/.*"csrfToken":"\([^"]*\)".*/\1/p')"

  curl -sS -D "$LOGIN_HEADERS" -o "$LOGIN_BODY" \
    -b "$COOKIE_JAR" \
    -c "$COOKIE_JAR" \
    -X POST "$SITE_URL/api/auth/callback/credentials" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "csrfToken=$csrf_token" \
    --data-urlencode "email=$EMAIL" \
    --data-urlencode "password=$PASSWORD" \
    --data-urlencode 'json=true' >/dev/null

  if grep -q "__Secure-authjs.session-token" "$LOGIN_HEADERS"; then
    login_succeeded=true
    break
  fi

  if grep -q "code=service_unavailable" "$LOGIN_HEADERS"; then
    echo "Login attempt $attempt/4 hit service_unavailable; retrying..."
    sleep 2
    continue
  fi

  break
done

echo "-- Login response headers --"
sed -n '1,20p' "$LOGIN_HEADERS"

if [[ "$login_succeeded" == true ]]; then
  echo "Login cookie issued."
else
  echo "Login cookie missing."
fi

echo
echo "==> Verifying dashboard"
dashboard_status="$(curl -sS -o /tmp/evestime-dashboard.html -w '%{http_code}' -b "$COOKIE_JAR" "$SITE_URL/dashboard")"
echo "Dashboard status: $dashboard_status"

echo
echo "==> Verifying admin leads API"
admin_status="$(curl -sS -o /tmp/evestime-admin-leads.json -w '%{http_code}' -b "$COOKIE_JAR" "$SITE_URL/api/admin/leads?page=1&pageSize=1")"
echo "Admin API status: $admin_status"

if [[ "$login_succeeded" == true && "$dashboard_status" == "200" && "$admin_status" == "200" ]]; then
  echo
  echo "==> Production auth and admin access are working"
  exit 0
fi

echo
echo "==> Auth/admin verification failed, running immediate page and API sweep"

for path in / /login /signup /dashboard /offers /coin-assets; do
  echo
  echo "--- PAGE $path ---"
  curl -sS -o /dev/null -D - "$SITE_URL$path" | sed -n '1,12p'
done

for path in \
  /api/auth/providers \
  /api/offers \
  /api/coin-assets \
  /api/leads \
  /api/test-db \
  /api/auth/diagnostics
do
  echo
  echo "--- API $path ---"
  if [[ "$path" == "/api/auth/diagnostics" ]]; then
    curl -sS -o /dev/null -D - "$SITE_URL$path" -H "x-auth-diagnostics-token: $AUTH_DIAGNOSTICS_TOKEN" | sed -n '1,12p'
  else
    curl -sS -o /dev/null -D - "$SITE_URL$path" | sed -n '1,12p'
  fi
done

echo
echo "==> Recent Vercel error logs (last 30m)"
vercel logs --environment production --since 30m --level error --limit 50 --no-follow || true

exit 1
