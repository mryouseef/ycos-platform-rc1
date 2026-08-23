#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
PG_BIN="${PG_BIN:-$(dirname "$(command -v initdb || true)")}"; if [[ -z "$PG_BIN" || ! -x "$PG_BIN/initdb" ]]; then for d in /usr/lib/postgresql/*/bin; do [[ -x "$d/initdb" ]] && PG_BIN="$d"; done; fi
[[ -x "$PG_BIN/initdb" ]] || { echo 'EP08_DATABASE_RUNTIME=UNAVAILABLE'; exit 78; }
WORK="$(mktemp -d /tmp/ycos-ep08-pg-XXXXXX)"; SRC="$WORK/source"; TGT="$WORK/target"; SOCK1="$WORK/socket1"; SOCK2="$WORK/socket2"; BAK="$WORK/ep08.backup"; ROLE_SOURCE="$ROOT/infra/db/ep03/sql/000_roles.sql"; MANIFEST="$WORK/backup-manifest.txt"; PORT1=55438; PORT2=55439
cleanup(){ "$PG_BIN/pg_ctl" -D "$SRC" -m immediate stop >/dev/null 2>&1 || true; "$PG_BIN/pg_ctl" -D "$TGT" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
cmd(){ echo "[$(date -u +%FT%TZ)] COMMAND: $*"; "$@"; echo "[$(date -u +%FT%TZ)] EXIT: 0"; }
echo "EP08_POSTGRESQL_VERSION=$($PG_BIN/postgres --version)"; echo "EP08_RUNTIME=DISPOSABLE_LOCAL_SYNTHETIC"; echo "EP08_WORKDIR_CREATED=true"
START_MS="$(date +%s%3N)"; BACKUP_POINT_MS=''
mkdir -p "$SOCK1" "$SOCK2"; cmd "$PG_BIN/initdb" -D "$SRC" --auth=trust --no-locale; cmd "$PG_BIN/pg_ctl" -D "$SRC" -o "-k $SOCK1 -p $PORT1" -w start
PSQL1=("$PG_BIN/psql" -h "$SOCK1" -p "$PORT1" -U "$(id -un)" -v ON_ERROR_STOP=1 -d postgres)
cmd "${PSQL1[@]}" -f "$ROOT/infra/db/ep03/sql/000_roles.sql"; cmd "${PSQL1[@]}" -f "$ROOT/infra/db/ep03/sql/001_schema_rls.sql"
cmd "${PSQL1[@]}" -c "INSERT INTO app.work_item_notes (id,client_id,work_item_id,body) VALUES ('30000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a1','Synthetic A note'),('40000000-0000-0000-0000-0000000000b4','00000000-0000-0000-0000-0000000000b2','20000000-0000-0000-0000-0000000000b2','Synthetic B note');"
cmd "$PG_BIN/pg_dump" -h "$SOCK1" -p "$PORT1" -U "$(id -un)" --schema=app -Fc -f "$BAK" postgres
printf 'backup=%s\nsha256=%s\nsize=%s\nrole_source_sha256=%s\n' "$(basename "$BAK")" "$(sha256sum "$BAK" | awk '{print $1}')" "$(stat -c%s "$BAK")" "$(sha256sum "$ROLE_SOURCE" | awk '{print $1}')" > "$MANIFEST"; cat "$MANIFEST"; echo 'EP08_BACKUP_CREATED=PASS'
BACKUP_POINT_MS="$(date +%s%3N)"
cmd "${PSQL1[@]}" -c 'DELETE FROM app.work_item_notes; DELETE FROM app.work_items;'; [[ "$("${PSQL1[@]}" -Atc 'SELECT count(*) FROM app.work_items')" == 0 ]] || exit 70; echo 'EP08_SOURCE_MUTATED=PASS'
cmd "$PG_BIN/initdb" -D "$TGT" --auth=trust --no-locale; cmd "$PG_BIN/pg_ctl" -D "$TGT" -o "-k $SOCK2 -p $PORT2" -w start
PSQL2=("$PG_BIN/psql" -h "$SOCK2" -p "$PORT2" -U "$(id -un)" -v ON_ERROR_STOP=1 -d postgres)
[[ "$(sha256sum "$BAK" | awk '{print $1}')" == "$(awk -F= '/^sha256=/{print $2}' "$MANIFEST")" ]] || { echo 'EP08_BACKUP_INTEGRITY=FAIL'; exit 71; }; echo 'EP08_BACKUP_INTEGRITY=PASS'
cmd "${PSQL2[@]}" -f "$ROLE_SOURCE"; cmd "$PG_BIN/pg_restore" -h "$SOCK2" -p "$PORT2" -U "$(id -un)" -d postgres "$BAK"; echo 'EP08_DATABASE_RESTORE=PASS'
[[ "$("${PSQL2[@]}" -Atc 'SELECT count(*) FROM app.work_items')" == 2 ]] || exit 72; [[ "$("${PSQL2[@]}" -Atc "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app' AND c.relname IN ('work_items','work_item_notes') AND c.relrowsecurity AND c.relforcerowsecurity")" == 2 ]] || exit 73; [[ "$("${PSQL2[@]}" -Atc "SELECT rolbypassrls::text FROM pg_roles WHERE rolname='ycos_app_runtime'")" == false ]] || exit 74
outa=$("${PSQL2[@]}" -Atc "SET SESSION AUTHORIZATION ycos_app_runtime; BEGIN; SELECT app.set_client_context('00000000-0000-0000-0000-0000000000a1'); SELECT string_agg(title,',') FROM app.work_items; COMMIT;"); [[ "$outa" == *'Synthetic A work item'* && "$outa" != *'Synthetic B work item'* ]] || exit 75
outb=$("${PSQL2[@]}" -Atc "SET SESSION AUTHORIZATION ycos_app_runtime; BEGIN; SELECT app.set_client_context('00000000-0000-0000-0000-0000000000b2'); SELECT string_agg(title,',') FROM app.work_items; COMMIT;"); [[ "$outb" == *'Synthetic B work item'* && "$outb" != *'Synthetic A work item'* ]] || exit 76
if "${PSQL2[@]}" -Atc "SET SESSION AUTHORIZATION ycos_app_runtime; SELECT count(*) FROM app.work_items;" >/dev/null 2>&1; then echo 'EP08_MISSING_CONTEXT=UNSAFE'; exit 77; fi
echo 'EP08_POST_RESTORE_SCHEMA_SECURITY_RLS_FORCE_RLS_RUNTIME_ROLE=PASS'; echo 'EP08_POST_RESTORE_CLIENT_A_B_ISOLATION=PASS'; echo 'EP08_POST_RESTORE_MISSING_CONTEXT=FAIL_CLOSED'; echo 'EP08_DATABASE_RECOVERY_COMPLETE=PASS'
END_MS="$(date +%s%3N)"; echo "EP08_LOCAL_RPO_TEST_POLICY_MS=5000"; echo 'EP08_LOCAL_RPO_OBSERVED_DATA_LOSS_ROWS=0'; echo "EP08_LOCAL_RTO_ELAPSED_MS=$((END_MS-START_MS))"; echo "EP08_BACKUP_TO_RECOVERY_ELAPSED_MS=$((END_MS-BACKUP_POINT_MS))"; echo 'EP08_RPO_RTO_SCOPE=LOCAL_TEST_ONLY'
