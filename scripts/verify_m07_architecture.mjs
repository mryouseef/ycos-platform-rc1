import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const rules = [
  ["M07-A01", /use client[\s\S]*(?:m07repo|\.\/repository|\.\/service)/],
  ["M07-A02", /fetch\(['"]https?:/],
  ["M07-A03", /prisma|typeorm|mongoose/],
  ["M07-A04", /provider-sdk/],
  ["M07-A05", /audit\s*:\s*{[^}]*?(title|summary|description)/],
  ["M07-A06", /clientId.*searchParams|tenantId.*searchParams/],
  ["M07-A07", /transition[A-Za-z]*\([^)]*\)[\s\S]*state\s*=/],
  ["M07-A08", /https:\/\/fonts\.|fonts\.googleapis/]
];
const walk = d => !fs.existsSync(d) ? [] : fs.readdirSync(d, { withFileTypes: true }).flatMap(e => { const p = path.join(d, e.name); return e.isDirectory() ? walk(p) : /\.(ts|tsx|css)$/.test(p) ? [p] : []; });
export function scanProject(root) { return [...walk(path.join(root, "src/m07")), ...walk(path.join(root, "app")).filter(f => !f.endsWith("globals.css") && !f.endsWith("global-error.tsx"))].flatMap(f => { const text = fs.readFileSync(f, "utf8"); return rules.filter(([, regex]) => regex.test(text)).map(([code]) => `${code}:${path.relative(root, f)}`); }); }
const samples = ["'use client'; import { m07repo } from './repository'", "fetch('https:", "prisma", "provider-sdk", "audit: { title", "clientId searchParams", "transitionDecision() state =", "https://fonts.googleapis"];
if (process.argv[1] === fileURLToPath(import.meta.url)) { const root = path.resolve(process.argv[2] || "."); const hits = scanProject(root); if (hits.length) { console.error(hits.join("\n")); process.exit(2); } const base = fs.mkdtempSync(path.join(os.tmpdir(), "m07-fixtures-")); for (let i = 0; i < rules.length; i++) { const [code] = rules[i]; const fixture = path.join(base, code, "src/m07"); fs.mkdirSync(fixture, { recursive: true }); fs.writeFileSync(path.join(fixture, "bad.ts"), samples[i]); if (!scanProject(path.join(base, code)).some(hit => hit.startsWith(code + ":"))) { console.error(`fixture ${code} failed`); process.exit(3); } } console.log(`M07_ARCHITECTURE_PASS rules=${rules.length} fixtureProjects=${rules.length}`); }
