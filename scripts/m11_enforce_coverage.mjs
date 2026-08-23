import { readFileSync } from "node:fs";
const text = readFileSync(process.argv[2], "utf8");
const match = text.match(/all files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
if (!match) throw new Error("COVERAGE_SUMMARY_MISSING");
const [line, branch, funcs] = match.slice(1).map(Number);
if (line < 70 || branch < 60 || funcs < 60) throw new Error(`COVERAGE_GATE_FAILURE line=${line} branch=${branch} funcs=${funcs}`);
console.log(`COVERAGE_GATE_PASS line=${line} branch=${branch} funcs=${funcs}`);
