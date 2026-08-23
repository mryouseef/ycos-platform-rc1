import { existsSync, readFileSync } from "node:fs";
const manifest = "M-10-PACKAGE-SHA256SUMS.txt";
if (existsSync(manifest)) {
  const lines = readFileSync(manifest, "utf8").trim().split("\n");
  if (lines.some((line) => line.includes(manifest))) throw new Error("SELF_REFERENTIAL_MANIFEST_DETECTED");
}
console.log("MANIFEST_POLICY_PASS");
