#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"; BASE="$(sudo -u postgres -- mktemp -d)"; STAGE="$(mktemp -d)"; chmod 755 "$STAGE"; SOCK="$BASE/socket"; DATA="$BASE/data"; PORT=55455
cleanup(){ sudo -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; sudo -u postgres -- rm -rf "$BASE"; rm -rf "$STAGE"; }
trap cleanup EXIT
sudo -u postgres -- mkdir "$SOCK" "$DATA"; sudo -u postgres -- chmod 755 "$BASE" "$SOCK"
sudo -u postgres -- /usr/lib/postgresql/16/bin/initdb -D "$DATA" -A trust >/dev/null
sudo -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl -D "$DATA" -o "-k $SOCK -p $PORT" -w start >/dev/null
cp "$ROOT/infra/pn03/migrations/001_work_items.sql" "$STAGE/001_rc1.sql"; cp "$ROOT/infra/ile01/migrations/001_ile_rls.sql" "$STAGE/001_ile_rls.sql"; chmod 644 "$STAGE/001_rc1.sql" "$STAGE/001_ile_rls.sql"; sudo -u postgres -- cp "$STAGE/001_rc1.sql" "$STAGE/001_ile_rls.sql" "$BASE/"; sudo -u postgres -- chmod 644 "$BASE/001_rc1.sql" "$BASE/001_ile_rls.sql"
sudo -u postgres -- psql -X -q -h "$SOCK" -p "$PORT" -d postgres -f "$BASE/001_rc1.sql"
sudo -u postgres -- psql -X -q -h "$SOCK" -p "$PORT" -d postgres -f "$BASE/001_ile_rls.sql"
sudo -u postgres -- psql -X -q -h "$SOCK" -p "$PORT" -d postgres -c "INSERT INTO work_items VALUES ('W-A','SYNTHETIC_A','draft',1,'synthetic'),('W-B','SYNTHETIC_B','draft',1,'synthetic');"
export ILE01_MANAGED_DATABASE_URL="postgres://ycos_ile_runtime@127.0.0.1:$PORT/postgres"
export ILE01_MANAGED_PG_ALLOW_INSECURE_TEST=true
cd "$ROOT"; pnpm exec tsx --test tests/ile01-managed-pooling.test.ts
