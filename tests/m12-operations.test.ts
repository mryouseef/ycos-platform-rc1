import assert from "node:assert/strict";
import test from "node:test";
import { actors } from "../src/portal/fixtures";
import { m12repo } from "../src/m12/repository";
import { backup, emit, health, raiseIncident, restore, rollback, setHealth, transitionIncident } from "../src/m12/service";

const reset = () => m12repo.reset();

test("M12 detects healthy and degraded simulated health without provider telemetry", () => {
  reset(); assert.equal(health(), "HEALTHY");
  assert.equal(setHealth(actors.OPS_A, "DEGRADED").ok, true);
  assert.equal(health(), "DEGRADED");
  assert.equal(setHealth(actors.CLIENT_A, "UNAVAILABLE").ok, false);
});

test("M12 telemetry is minimized, operationally authorized, and unrelated to business approval authority", () => {
  reset(); const signal = emit(actors.OPS_A, { signal: "AUTHORIZATION_DENIAL", outcome: "DENY", severity: "HIGH", safeReason: "NOT_AVAILABLE", correlationId: "m12-safe" });
  assert.equal(signal.ok, true); if (!signal.ok) return;
  assert.equal(signal.value.environment, "SIMULATED_LOCAL");
  assert.equal("payload" in signal.value, false);
  assert.equal(emit(actors.MANAGER_A, { signal: "SECURITY_EVENT", outcome: "DENY", severity: "CRITICAL", correlationId: "x" }).ok, false);
});

test("M12 incident lifecycle enforces operator-only containment and closed state sequence", () => {
  reset(); const incident = raiseIncident(actors.OPS_A, "ISOLATION", "CRITICAL", "SAFE_SCOPE_ALPHA");
  assert.equal(incident.ok, true); if (!incident.ok) return;
  assert.equal(incident.value.privacy, true);
  let current = incident.value;
  for (const next of ["TRIAGED", "CONTAINED", "RECOVERING", "VALIDATED", "CLOSED"] as const) { const result = transitionIncident(actors.OPS_A, current.id, next, current.version); assert.equal(result.ok, true); if (result.ok) current = result.value; }
  assert.equal(transitionIncident(actors.CLIENT_A, current.id, "CLOSED", current.version).ok, false);
});

test("M12 synthetic backup verifies integrity, corruption fails closed, and authorized restore preserves synthetic client boundaries", () => {
  reset(); const before = m12repo.snapshot(); const created = backup(actors.OPS_A); assert.equal(created.ok, true); if (!created.ok) return;
  assert.equal(restore(actors.CLIENT_A, created.value.id).ok, false);
  m12repo.corrupt(created.value.id); const corrupt = restore(actors.OPS_A, created.value.id); assert.equal(corrupt.ok, false); if (!corrupt.ok) assert.equal(corrupt.error, "BACKUP_CORRUPT");
  m12repo.reset(); const valid = backup(actors.OPS_A); assert.equal(valid.ok, true); if (!valid.ok) return;
  assert.equal(restore(actors.OPS_A, valid.value.id).ok, true); assert.deepEqual(m12repo.snapshot(), before);
});

test("M12 simulated rollback cannot become a production promotion and has version conflict protection", () => {
  reset(); const candidate = m12repo.release();
  assert.equal(rollback(actors.CLIENT_A, candidate.version).ok, false);
  assert.equal(rollback(actors.OPS_A, candidate.version + 1).ok, false);
  const result = rollback(actors.OPS_A, candidate.version); assert.equal(result.ok, true); if (result.ok) assert.equal(result.value.state, "ROLLED_BACK");
});
