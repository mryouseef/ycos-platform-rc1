import { readFileSync } from "node:fs";
const audit = JSON.parse(readFileSync(process.argv[2], "utf8"));
const severity = audit.metadata?.vulnerabilities ?? {};
const levels = ["low", "moderate", "high", "critical"];
const regressions = levels.filter((level) => Number(severity[level] ?? 0) > 0);
if (regressions.length) throw new Error(`DEPENDENCY_AUDIT_FAILURE ${regressions.map((level) => `${level}=${severity[level]}`).join(" ")}`);
console.log("DEPENDENCY_AUDIT_PASS");
