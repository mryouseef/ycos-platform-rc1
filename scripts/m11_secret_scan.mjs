import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.argv[2] ?? ".";
const excluded = new Set(["node_modules", ".next", ".git", "reference", "playwright-report"]);
const patterns = [/(?:AKIA)[0-9A-Z]{16}/, /-----BEGIN (?:RSA|OPENSSH) PRIVATE KEY-----/, /(?:sk_)[A-Za-z0-9]{20,}/];
export const scanSecrets = (dir) => {
  const hits = [];
  for (const entry of readdirSync(dir)) {
    if (excluded.has(entry)) continue;
    const path = join(dir, entry);
    const info = statSync(path);
    if (info.isDirectory()) hits.push(...scanSecrets(path));
    else if (info.size < 2_000_000) {
      const text = readFileSync(path, "utf8");
      if (patterns.some((pattern) => pattern.test(text))) hits.push(relative(root, path));
    }
  }
  return hits;
};
const hits = scanSecrets(root);
if (hits.length) { console.error(`SECRET_SCAN_FAILURE\n${hits.join("\n")}`); process.exit(1); }
console.log("SECRET_SCAN_PASS");
