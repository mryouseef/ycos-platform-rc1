#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"; BASE="$(sudo -u postgres -- mktemp -d)"; SOCK="$BASE/socket"; DATA="$BASE/data"; MIGRATION="$BASE/001_work_items.sql"; PORT=55433
cleanup(){ sudo -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; sudo -u postgres -- rm -rf "$BASE"; }; trap cleanup EXIT
cat "$ROOT/infra/pn03/migrations/001_work_items.sql" | sudo -u postgres -- tee "$MIGRATION" >/dev/null
sudo -u postgres -- mkdir "$SOCK" "$DATA"
sudo -u postgres -- chmod 755 "$BASE" "$SOCK"
sudo -u postgres -- /usr/lib/postgresql/16/bin/initdb -D "$DATA" -A trust >/dev/null
sudo -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl -D "$DATA" -o "-k $SOCK -p $PORT" -w start >/dev/null
sudo -u postgres -- psql -X -q -h "$SOCK" -p "$PORT" -d postgres -f "$MIGRATION"
sudo -u postgres -- psql -X -q -h "$SOCK" -p "$PORT" -d postgres -c "INSERT INTO work_items VALUES ('W-A','SYNTHETIC_A','draft',1,'synthetic'),('W-B','SYNTHETIC_B','draft',1,'synthetic');"
cd "$ROOT"; IAF01_PG_SOCKET="$SOCK" IAF01_PG_PORT="$PORT" pnpm exec tsx tests/iaf01-postgres-e2e.test.ts
