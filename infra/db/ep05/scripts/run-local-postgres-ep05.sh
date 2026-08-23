#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"; pg_bindir="${EP05_PG_BINDIR:-$(pg_config --bindir 2>/dev/null || true)}"; psql_bin="$(command -v psql || true)"; bootstrap_user="${EP05_PG_BOOTSTRAP_USER:-$(id -un)}"
if [ -z "$pg_bindir" ] || [ ! -x "$pg_bindir/initdb" ] || [ ! -x "$pg_bindir/pg_ctl" ] || [ ! -x "$pg_bindir/postgres" ] || [ -z "$psql_bin" ]; then echo 'NOT EXECUTED — LOCAL POSTGRESQL TOOLING UNAVAILABLE'; exit 3; fi
workdir="$(mktemp -d)"; outdir="${EP05_EVIDENCE_DIR:-$workdir/evidence}"; socketdir="$workdir/socket"; port="${EP05_PG_PORT:-55434}"; mkdir -p "$outdir" "$socketdir"
cleanup() { if [ -f "$workdir/data/postmaster.pid" ]; then "$pg_bindir/pg_ctl" -D "$workdir/data" -m immediate stop >/dev/null 2>&1 || true; fi; rm -rf "$workdir"; }; trap cleanup EXIT
"$pg_bindir/initdb" -D "$workdir/data" -A trust --no-locale >/dev/null
"$pg_bindir/pg_ctl" -D "$workdir/data" -l "$outdir/postgresql-startup.log" -o "-h 127.0.0.1 -k '$socketdir' -p $port" -w start
for sql in "$root/infra/db/ep03/sql/000_roles.sql" "$root/infra/db/ep03/sql/001_schema_rls.sql" "$root/infra/db/ep04/sql/002_document_metadata.sql" "$root/infra/db/ep05/sql/003_identity_authorization.sql"; do "$psql_bin" -X -v ON_ERROR_STOP=1 -h "$socketdir" -p "$port" -U "$bootstrap_user" -d postgres -f "$sql"; done
"$psql_bin" -X -v ON_ERROR_STOP=1 -h "$socketdir" -p "$port" -U "$bootstrap_user" -d postgres -f "$root/infra/db/ep05/tests/identity-membership-rls.sql" | tee "$outdir/identity-membership-rls.txt"
"$psql_bin" -X -v ON_ERROR_STOP=1 -h "$socketdir" -p "$port" -U "$bootstrap_user" -d postgres -f "$root/infra/db/ep05/sql/031_identity_catalog_evidence.sql" | tee "$outdir/identity-catalog.txt"
"$pg_bindir/postgres" --version | tee "$outdir/postgresql-version.txt"
echo 'EP-05 LOCAL IDENTITY MEMBERSHIP RLS TESTS=PASS'
