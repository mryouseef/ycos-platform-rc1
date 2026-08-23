#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
BIN_DIR="${PG_BIN_DIR:-/usr/lib/postgresql/16/bin}"
if [[ ! -x "$BIN_DIR/initdb" || ! -x "$BIN_DIR/pg_ctl" || ! -x "$BIN_DIR/psql" ]]; then echo "EP11_POSTGRES_UNAVAILABLE"; exit 78; fi
WORK="$(mktemp -d /tmp/ycos-ep11-pg-XXXXXX)"; DATA="$WORK/data"; SOCKET="$WORK/socket"; PORT=55411
cleanup() { "$BIN_DIR/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
mkdir -p "$SOCKET"; "$BIN_DIR/initdb" -D "$DATA" -A trust --no-locale >/dev/null
"$BIN_DIR/pg_ctl" -D "$DATA" -o "-k $SOCKET -p $PORT" -w start >/dev/null
PSQL=("$BIN_DIR/psql" -h "$SOCKET" -p "$PORT" -v ON_ERROR_STOP=1)
echo "POSTGRES_VERSION=$("$BIN_DIR/psql" -h "$SOCKET" -p "$PORT" -d postgres -Atqc 'SHOW server_version')"
"${PSQL[@]}" -d postgres -c "CREATE ROLE ycos_ep11_runtime LOGIN NOBYPASSRLS;"
"${PSQL[@]}" -d postgres -f "$ROOT/infra/db/ep11/sql/005_privacy_lifecycle.sql"
"${PSQL[@]}" -d postgres -c "GRANT SELECT, INSERT, UPDATE, DELETE ON ycos_privacy_record, ycos_privacy_hold TO ycos_ep11_runtime;"
echo "CATALOG_FORCE_RLS=$("$BIN_DIR/psql" -h "$SOCKET" -p "$PORT" -d postgres -Atqc "SELECT relforcerowsecurity FROM pg_class WHERE relname='ycos_privacy_record'")"
echo "CATALOG_RUNTIME_BYPASSRLS=$("$BIN_DIR/psql" -h "$SOCKET" -p "$PORT" -d postgres -Atqc "SELECT rolbypassrls FROM pg_roles WHERE rolname='ycos_ep11_runtime'")"
RUNTIME=("$BIN_DIR/psql" -h "$SOCKET" -p "$PORT" -U ycos_ep11_runtime -d postgres -v ON_ERROR_STOP=1)
"${RUNTIME[@]}" <<'SQL'
BEGIN;
SELECT set_config('app.client_id','00000000-0000-0000-0000-0000000000a1',true);
INSERT INTO ycos_privacy_record(record_id,client_id,classification,purpose_reference,lifecycle_state,retention_policy_reference) VALUES ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000a1','SENSITIVE','synthetic-purpose','ACTIVE','synthetic-policy');
SELECT 'CLIENT_A_VISIBLE=' || count(*) FROM ycos_privacy_record;
COMMIT;
BEGIN;
SELECT set_config('app.client_id','00000000-0000-0000-0000-0000000000b2',true);
SELECT 'CLIENT_B_EXACT_ID_VISIBLE=' || count(*) FROM ycos_privacy_record WHERE record_id='11111111-1111-1111-1111-111111111111';
UPDATE ycos_privacy_record SET lifecycle_state='DISPOSED' WHERE record_id='11111111-1111-1111-1111-111111111111';
SELECT 'CLIENT_B_UPDATE_ROWS=' || count(*) FROM ycos_privacy_record WHERE lifecycle_state='DISPOSED';
COMMIT;
BEGIN;
SELECT set_config('app.client_id','00000000-0000-0000-0000-0000000000a1',true);
UPDATE ycos_privacy_record SET lifecycle_state='RETENTION_EVALUATED' WHERE record_id='11111111-1111-1111-1111-111111111111';
SELECT 'CLIENT_A_UPDATE_VISIBLE=' || count(*) FROM ycos_privacy_record WHERE lifecycle_state='RETENTION_EVALUATED';
COMMIT;
SQL
echo "EP11_POSTGRES_RUNTIME_PASS"
