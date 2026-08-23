import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { M08CommandPanel } from "../src/m08/command-panel";

test("M10 component: knowledge review control is visible only to the authorized role and state", () => {
  const allowed = renderToStaticMarkup(<M08CommandPanel kind="knowledge" role="ROLE-05" rows={[{ id: "kn-alpha", state: "CANDIDATE", version: 1 }]} />);
  const denied = renderToStaticMarkup(<M08CommandPanel kind="knowledge" role="ROLE-02" rows={[{ id: "kn-alpha", state: "CANDIDATE", version: 1 }]} />);
  assert.match(allowed, /Send to review/);
  assert.doesNotMatch(denied, /Send to review/);
  assert.match(allowed, /aria-label="Governed knowledge commands"/);
});

test("M10 component: approval and revocation controls follow role, resource, and lifecycle visibility", () => {
  const approval = renderToStaticMarkup(<M08CommandPanel kind="knowledge" role="ROLE-03" rows={[{ id: "kn-alpha", state: "IN_REVIEW", version: 2 }]} />);
  const inactiveApproval = renderToStaticMarkup(<M08CommandPanel kind="knowledge" role="ROLE-03" rows={[{ id: "kn-alpha", state: "CANDIDATE", version: 1 }]} />);
  const revoke = renderToStaticMarkup(<M08CommandPanel kind="document" role="ROLE-07" rows={[{ id: "doc-alpha", state: "EFFECTIVE", version: 3 }]} />);
  assert.match(approval, /Approve/);
  assert.doesNotMatch(inactiveApproval, /Approve/);
  assert.match(revoke, /Revoke access/);
});
