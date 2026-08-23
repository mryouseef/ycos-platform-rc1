import assert from "node:assert/strict";
import test from "node:test";
import { actors } from "../src/portal/fixtures";
import { m08repo } from "../src/m08/repository";
import { approveKnowledge, readKnowledge, reviewKnowledge, revokeSource } from "../src/m08/service";

test("M10 integration: authoritative actor → scoped repository → review → separate approval → purpose-bound read → revocation", () => {
  m08repo.reset();
  const review = reviewKnowledge(actors.PROJECT_A, "kn-alpha-candidate", 1);
  assert.equal(review.ok, true);
  if (!review.ok) return;
  assert.equal(review.audit.outcome, "ALLOW");
  const approve = approveKnowledge(actors.MANAGER_A, review.value.id, review.value.version);
  assert.equal(approve.ok, true);
  if (!approve.ok) return;
  const readable = readKnowledge(actors.CONSULTANT_A, approve.value.id, "CONSULTING_DELIVERY");
  assert.equal(readable.ok, true);
  const wrongPurpose = readKnowledge(actors.CONSULTANT_A, approve.value.id, "OTHER_PURPOSE");
  assert.equal(wrongPurpose.ok, false);
  const revoke = revokeSource(actors.RECORDS_A, "doc-alpha-01", 1);
  assert.equal(revoke.ok, true);
  const afterRevocation = readKnowledge(actors.CONSULTANT_A, approve.value.id, "CONSULTING_DELIVERY");
  assert.equal(afterRevocation.ok, false);
  if (!afterRevocation.ok) assert.equal(afterRevocation.error, "GOVERNANCE_INELIGIBLE");
});
