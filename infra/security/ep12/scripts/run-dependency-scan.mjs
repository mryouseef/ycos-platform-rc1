import { spawn } from "node:child_process";
const child = spawn("pnpm", ["audit", "--prod", "--json"], { cwd: process.cwd(), env: process.env }); let stdout = "", stderr = "";
child.stdout.on("data", value => stdout += value); child.stderr.on("data", value => stderr += value);
const exitCode = await new Promise(resolve => child.on("close", resolve));
console.log("TOOL=pnpm audit --prod --json"); console.log(`TOOL_EXIT_CODE=${exitCode}`); console.log("ADVISORY_DATA_LIMITATION=Registry advisory availability may affect this local scan; no vulnerability-free production claim is made."); console.log(exitCode === 0 ? "DEPENDENCY_SCAN_STATUS=PASS" : "DEPENDENCY_SCAN_STATUS=PARTIAL"); console.log("--- STDOUT ---"); console.log(stdout || "<empty>"); console.log("--- STDERR ---"); console.log(stderr || "<empty>");
