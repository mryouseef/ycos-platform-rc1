#!/usr/bin/env bash
set -euo pipefail

echo "EP15_POSTGRESQL_INTEGRATION_WRAPPER"
echo "POSTGRESQL_VERSION=$(psql --version)"
echo "SCOPE=synthetic-only; disposable-local-runtime; no-production-database"
bash "$(cd "$(dirname "$0")/../../ep13/scripts" && pwd)/run-local-postgres-ep13.sh"
echo "EP15_POSTGRESQL_RLS_CONNECTION_CONTINUITY_PASS"
