import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";

for (const script of ["verify_m05_architecture.mjs", "verify_m06_architecture.mjs", "verify_m07_architecture.mjs", "verify_m08_architecture.mjs", "verify_m09_architecture.mjs"]) {
  test(`M10 mutation effectiveness: ${script} rejects its isolated control-breaking fixture`, () => {
    const result = spawnSync(process.execPath, [`scripts/${script}`], { cwd: process.cwd(), encoding: "utf8" });
    assert.equal(result.status, 0, `${script} must pass only after each internal negative fixture proves a violation is detected`);
    assert.match(`${result.stdout}${result.stderr}`, /fixture|fixtures|rule|rules/i);
  });
}
