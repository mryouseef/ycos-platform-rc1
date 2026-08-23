import { readFileSync } from "node:fs";
const workflow = readFileSync(".github/workflows/verify.yml", "utf8");
const required = ["pnpm install --frozen-lockfile", "pnpm run check", "pnpm run lint", "experimental-test-coverage", "m11_enforce_coverage", "m11_secret_scan", "m11_enforce_audit", "verify_m09_architecture", "pnpm run build", "m11_make_release_candidate", "m11_verify_release_candidate", "playwright test", "permissions:\n  contents: read"];
for (const item of required) if (!workflow.includes(item)) throw new Error(`CI_REQUIRED_STAGE_MISSING ${item}`);
if (/continue-on-error\s*:|\|\|\s*true/.test(workflow)) throw new Error("CI_FAIL_OPEN_PATTERN_DETECTED");
if (/deploy|production environment|environment:\s*production/i.test(workflow)) throw new Error("CI_UNAUTHORIZED_DEPLOYMENT_PATTERN");
console.log("CI_CONFIG_PASS");
