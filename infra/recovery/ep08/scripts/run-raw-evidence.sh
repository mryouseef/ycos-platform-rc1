#!/usr/bin/env bash
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
OUTDIR="${1:?output directory required}"
mkdir -p "$OUTDIR"
BICEP="${BICEP_BIN:-/tmp/ep01-tools/bicep-linux-x64}"
record(){ local name="$1"; shift; local file="$OUTDIR/$name"; local started ended status; started="$(date +%s%3N)"; { echo "TIMESTAMP_UTC=$(date -u +%FT%TZ)"; echo "NODE_VERSION=$(node --version)"; echo "COMMAND=$(printf '%q ' "$@")"; } >"$file"; "$@" >>"$file" 2>&1; status=$?; ended="$(date +%s%3N)"; { echo "EXIT_CODE=$status"; echo "ELAPSED_MS=$((ended-started))"; } >>"$file"; return "$status"; }
record ep08-database-backup-restore.txt bash "$ROOT/infra/recovery/ep08/scripts/run-postgres-backup-restore.sh" || exit $?
record ep08-runtime-recovery.txt node --test "$ROOT/infra/recovery/ep08/tests/runtime-recovery.test.mjs" || exit $?
record ep08-bicep-build.txt bash -lc "'$BICEP' --version && '$BICEP' build '$ROOT/infra/bicep/network/main.bicep' --outfile /tmp/ep08-final-network.json && '$BICEP' build-params '$ROOT/infra/bicep/network/params/controlled.bicepparam' --outfile /tmp/ep08-final-network-params.json" || exit $?
record ep08-static-security.txt node "$ROOT/infra/tests/ep08-security-rules.mjs" || exit $?
record ep08-negative-fixtures.txt node "$ROOT/infra/tests/negative-ep08.mjs" || exit $?
echo "EP08_RAW_EVIDENCE_COMPLETE=PASS"
