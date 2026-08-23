import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { scanSecrets } from "./m11_secret_scan.mjs";
const failures = [];
const expectFailure = (name, command, args, options = {}) => { const result = spawnSync(command, args, { encoding: "utf8", ...options }); if (result.status === 0) failures.push(name); };
const temp = mkdtempSync(join(tmpdir(), "m11-negative-"));
try {
  const typePath = join("src", "__m11_type_fixture.ts"); writeFileSync(typePath, "const x: string = 1;\n"); expectFailure("type", "pnpm", ["run", "check"]); rmSync(typePath);
  const lintPath = join("src", "__m11_lint_fixture.ts"); writeFileSync(lintPath, "export const = ;\n"); expectFailure("lint", "pnpm", ["run", "lint"]); rmSync(lintPath);
  const testPath = join("tests", "__m11_fail.test.ts"); writeFileSync(testPath, "import test from 'node:test'; test('m11 controlled failure',()=>{throw new Error('M11_TEST_FIXTURE')});\n"); expectFailure("test", process.execPath, ["--import", "tsx", "--test", testPath]); rmSync(testPath);
  const fakeCoverage = join(temp, "coverage.txt"); writeFileSync(fakeCoverage, "# all files | 1.00 | 1.00 | 1.00 |\n"); expectFailure("coverage", process.execPath, ["scripts/m11_enforce_coverage.mjs", fakeCoverage]);
  const secretFile = join(temp, "synthetic.txt"); writeFileSync(secretFile, `AKIA${"A".repeat(16)}`); if (!scanSecrets(temp).length) failures.push("secret");
  const audit = join(temp, "audit.json"); writeFileSync(audit, JSON.stringify({ metadata: { vulnerabilities: { low: 0, moderate: 0, high: 1, critical: 0 } } })); expectFailure("audit", process.execPath, ["scripts/m11_enforce_audit.mjs", audit]);
  const architecturePath = join("src", "m08", "__m11_architecture_fixture.ts"); writeFileSync(architecturePath, "fetch('https://fixture.invalid');\n"); expectFailure("architecture", process.execPath, ["scripts/verify_m09_architecture.mjs"]); rmSync(architecturePath);
  const broken = join("app", "__m11_build_fixture"); mkdirSync(broken); writeFileSync(join(broken, "page.tsx"), "export default function Broken(){ return <div>\n"); expectFailure("build", "pnpm", ["run", "build"]); rmSync(broken, { recursive: true, force: true });
  const lockRoot = join(temp, "lock"); mkdirSync(lockRoot); for (const file of ["package.json", "pnpm-lock.yaml"]) writeFileSync(join(lockRoot, file), readFileSync(file)); const packageJson = JSON.parse(readFileSync(join(lockRoot, "package.json"), "utf8")); packageJson.devDependencies["m11-lock-fixture"] = "1.0.0"; writeFileSync(join(lockRoot, "package.json"), JSON.stringify(packageJson)); expectFailure("frozen-lockfile", "pnpm", ["install", "--frozen-lockfile"], { cwd: lockRoot });
} finally { rmSync(temp, { recursive: true, force: true }); }
if (failures.length) throw new Error(`NEGATIVE_FIXTURE_NOT_DETECTED ${failures.join(",")}`);
console.log("M11_NEGATIVE_FIXTURES_PASS type lint test coverage secret audit architecture build frozen-lockfile");
