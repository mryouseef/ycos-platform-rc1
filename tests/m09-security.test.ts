import test from "node:test";
import assert from "node:assert/strict";
import { boundedId, boundedTitle, boundedVersion } from "@/src/security/input";
import { actors } from "@/src/portal/fixtures";
import { m08repo } from "@/src/m08/repository";
import { readKnowledge, reviewKnowledge } from "@/src/m08/service";

test("M09 bounds malformed identifiers, versions, unexpected markup and oversized titles before command dispatch",()=>{
  assert.equal(boundedId("kn-alpha-candidate"),true);
  assert.equal(boundedId("../foreign"),false);
  assert.equal(boundedId("<script>"),false);
  assert.equal(boundedVersion(1),true);
  assert.equal(boundedVersion(0),false);
  assert.equal(boundedVersion("NaN"),false);
  assert.equal(boundedTitle("Synthetic governed work"),true);
  assert.equal(boundedTitle("<img src=x onerror=alert(1)>"),false);
  assert.equal(boundedTitle("x".repeat(141)),false);
});

test("M09 derived knowledge cannot silently downgrade its governing source classification",()=>{
  m08repo.reset();
  const candidate=m08repo.knowledgeItemFor(actors.PROJECT_A,"kn-alpha-candidate");
  assert.ok(candidate);
  m08repo.updateKnowledge({...candidate,classification:"INTERNAL"});
  const review=reviewKnowledge(actors.PROJECT_A,"kn-alpha-candidate",1);
  assert.equal(review.ok,false);
  if(!review.ok)assert.equal(review.error,"CLASSIFICATION_FLOOR_VIOLATION");
  const read=readKnowledge(actors.CONSULTANT_A,"kn-alpha-approved","CONSULTING_DELIVERY");
  assert.equal(read.ok,true);
  m08repo.reset();
});

test("M09 audit invariant remains safe after F-M07-01 correction",()=>{
  m08repo.reset();
  const allowed=readKnowledge(actors.CONSULTANT_A,"kn-alpha-approved","CONSULTING_DELIVERY");
  assert.equal(allowed.ok,true);
  if(allowed.ok)assert.equal("reason" in allowed.audit,false);
  const denied=readKnowledge(actors.CONSULTANT_A,"kn-alpha-approved","GOVERNANCE_REVIEW");
  assert.equal(denied.ok,false);
  if(!denied.ok)assert.ok(denied.audit.reason);
});
