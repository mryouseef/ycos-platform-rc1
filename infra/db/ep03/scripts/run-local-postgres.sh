#!/usr/bin/env bash
set -euo pipefail

# Disposable EP-03 harness. Uses trust authentication only inside a temporary local process.
pg_bindir="${EP03_PG_BINDIR:-$(pg_config --bindir 2>/dev/null || true)}"
psql_bin="$(command -v psql || true)"
bootstrap_user="${EP03_PG_BOOTSTRAP_USER:-$(id -un)}"
if [ -z "$pg_bindir" ] || [ ! -x "$pg_bindir/initdb" ] || [ ! -x "$pg_bindir/pg_ctl" ] || [ ! -x "$pg_bindir/postgres" ] || [ -z "$psql_bin" ]; then
  echo 'NOT EXECUTED — LOCAL POSTGRESQL TOOLING UNAVAILABLE'
  exit 3
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
workdir="$(mktemp -d)"
port="${EP03_PG_PORT:-55432}"
outdir="${EP03_EVIDENCE_DIR:-$workdir/evidence}"
socketdir="$workdir/socket"
mkdir -p "$outdir" "$socketdir"

cleanup() {
  if [ -f "$workdir/data/postmaster.pid" ]; then "$pg_bindir/pg_ctl" -D "$workdir/data" -m immediate stop >/dev/null 2>&1 || true; fi
  rm -rf "$workdir"
}
trap cleanup EXIT

"$pg_bindir/initdb" -D "$workdir/data" -A trust --no-locale >/dev/null
"$pg_bindir/pg_ctl" -D "$workdir/data" -l "$outdir/postgresql-startup.log" -o "-h 127.0.0.1 -k '$socketdir' -p $port" -w start
"$psql_bin" -X -v ON_ERROR_STOP=1 -h "$socketdir" -p "$port" -U "$bootstrap_user" -d postgres -f "$root/sql/000_roles.sql"
"$psql_bin" -X -v ON_ERROR_STOP=1 -h "$socketdir" -p "$port" -U "$bootstrap_user" -d postgres -f "$root/sql/001_schema_rls.sql"
"$psql_bin" -X -v ON_ERROR_STOP=1 -h "$socketdir" -p "$port" -U "$bootstrap_user" -d postgres -f "$root/tests/runtime-isolation.sql" | tee "$outdir/runtime-isolation.txt"
"$psql_bin" -X -v ON_ERROR_STOP=1 -h "$socketdir" -p "$port" -U "$bootstrap_user" -d postgres -f "$root/sql/011_role_catalog_evidence.sql" | tee "$outdir/role-catalog.txt"
"$psql_bin" -X -v ON_ERROR_STOP=1 -h "$socketdir" -p "$port" -U "$bootstrap_user" -d postgres -f "$root/sql/012_rls_catalog_evidence.sql" | tee "$outdir/rls-catalog.txt"
"$psql_bin" -X -v ON_ERROR_STOP=1 -h "$socketdir" -p "$port" -U "$bootstrap_user" -d postgres -f "$root/tests/context-lifecycle.sql" | tee "$outdir/context-lifecycle.txt"
"$psql_bin" -X -v ON_ERROR_STOP=1 -h "$socketdir" -p "$port" -U "$bootstrap_user" -d postgres -f "$root/tests/privilege-abuse.sql" | tee "$outdir/privilege-abuse.txt"
"$pg_bindir/postgres" --version | tee "$outdir/postgresql-version.txt"
echo 'EP-03 LOCAL RUNTIME TESTS=PASS'
