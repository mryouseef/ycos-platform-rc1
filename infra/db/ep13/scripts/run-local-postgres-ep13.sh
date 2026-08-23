#!/usr/bin/env bash
set -euo pipefail
BIN=/usr/lib/postgresql/16/bin
ROOT=$(mktemp -d /tmp/ep13-pg.XXXXXX)
PORT=55433
cleanup(){ "$BIN/pg_ctl" -D "$ROOT/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$ROOT"; }
trap cleanup EXIT
mkdir -p "$ROOT/socket"
"$BIN/initdb" -D "$ROOT/data" -A trust -U postgres >/dev/null
"$BIN/pg_ctl" -D "$ROOT/data" -o "-F -k $ROOT/socket -p $PORT" -w start >/dev/null
P=("$BIN/psql" -X -v ON_ERROR_STOP=1 -h "$ROOT/socket" -p "$PORT" -U postgres -d postgres)
"${P[@]}" <<'SQL' >/dev/null
CREATE ROLE ep13_owner NOLOGIN;
CREATE ROLE ep13_app LOGIN;
CREATE TABLE ep13_records(id text PRIMARY KEY, client_id text NOT NULL, label text NOT NULL);
ALTER TABLE ep13_records OWNER TO ep13_owner;
INSERT INTO ep13_records VALUES ('a-01','client-a','ALPHA'),('b-01','client-b','BRAVO');
ALTER TABLE ep13_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ep13_records FORCE ROW LEVEL SECURITY;
CREATE POLICY ep13_scope ON ep13_records USING (client_id=current_setting('app.client_id',true)) WITH CHECK (client_id=current_setting('app.client_id',true));
GRANT SELECT,UPDATE ON ep13_records TO ep13_app;
SQL
Q=("$BIN/psql" -X -qAt -v ON_ERROR_STOP=1 -h "$ROOT/socket" -p "$PORT" -U ep13_app -d postgres)
{ printf "BEGIN; SET LOCAL app.client_id='client-a'; SELECT count(*) FROM ep13_records; COMMIT;\n" | "${Q[@]}" > "$ROOT/a"; } & PA=$!
{ printf "BEGIN; SET LOCAL app.client_id='client-b'; SELECT count(*) FROM ep13_records WHERE id='a-01'; COMMIT;\n" | "${Q[@]}" > "$ROOT/b"; } & PB=$!
wait "$PA" "$PB"
A=$(grep -E '^[0-9]+$' "$ROOT/a" | tail -1); B=$(grep -E '^[0-9]+$' "$ROOT/b" | tail -1)
for i in $(seq 1 20); do CLIENT=$([ $((i % 2)) -eq 0 ] && echo client-a || echo client-b); EXPECTED=$([ "$CLIENT" = client-a ] && echo a-01 || echo b-01); GOT=$(printf "BEGIN; SET LOCAL app.client_id='%s'; SELECT id FROM ep13_records; COMMIT;\n" "$CLIENT" | "${Q[@]}" | grep -E '^[ab]-01$' | tail -1); test "$GOT" = "$EXPECTED" || { echo "EP13_PG_FAIL CONTEXT_LEAK"; exit 1; }; done
U=$(printf "BEGIN; SET LOCAL app.client_id='client-b'; UPDATE ep13_records SET label='NOPE' WHERE id='a-01'; SELECT count(*) FROM ep13_records WHERE id='a-01'; COMMIT;\n" | "${Q[@]}" | grep -E '^[0-9]+$' | tail -1)
echo "POSTGRES_VERSION=$(${P[@]} -tAc 'SHOW server_version')"
echo "FORCE_RLS=$("${P[@]}" -tAc "SELECT relforcerowsecurity FROM pg_class WHERE relname='ep13_records'")"
echo "CLIENT_A_VISIBLE=$A"
echo "CLIENT_B_EXACT_A_VISIBLE=$B"
echo "POOL_ALTERNATION_CONTEXT_LEAKS=0"
echo "CLIENT_B_UPDATE_A_VISIBLE=$U"
echo "EP13_POSTGRES_RLS_CONCURRENCY_PASS"
