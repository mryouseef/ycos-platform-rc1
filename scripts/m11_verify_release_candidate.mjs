import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
const root = process.cwd();
const manifest = readFileSync(join(root, "artifacts", "m11", "release-candidate", "M-11-BUILD-SHA256SUMS.txt"), "utf8").trim().split("\n");
for (const line of manifest) { const [hash, file] = line.split("  "); const actual = createHash("sha256").update(readFileSync(join(root, file))).digest("hex"); if (hash !== actual) throw new Error(`M11_BUILD_INTEGRITY_FAILURE ${file}`); }
console.log(`M11_RELEASE_CANDIDATE_VERIFIED files=${manifest.length}`);
