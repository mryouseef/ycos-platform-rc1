import assert from "node:assert/strict";
import test from "node:test";
import { getInsight, locales, publicRoutes, resolveRoute, siteCopy } from "@/src/lib/site-data";

test("M-02 defines both approved locales", () => {
  assert.deepEqual(locales, ["ar", "en"]);
});

test("M-02 public content remains semantically paired", () => {
  assert.equal(siteCopy.ar.services.cards.length, 7);
  assert.equal(siteCopy.en.services.cards.length, 7);
  assert.equal(siteCopy.ar.methodology.steps.length, 4);
  assert.equal(siteCopy.en.methodology.steps.length, 4);
  assert.equal(siteCopy.ar.insights.items.length, siteCopy.en.insights.items.length);
});

test("M-02 resolves an approved insight and rejects unknown insights", () => {
  assert.equal(resolveRoute(["insights", "decision-architecture"])?.routeId, "R-PUB-07");
  assert.equal(resolveRoute(["insights", "not-authorized"]) , undefined);
  assert.equal(getInsight("ar", "bilingual-clarity")?.slug, "bilingual-clarity");
});

test("M-02 keeps portal entry noindex and public route list free of portal pages", () => {
  assert.equal(publicRoutes.find((route) => route.routeId === "R-ENT-01")?.noIndex, true);
  assert.equal(publicRoutes.some((route) => route.suffix.includes("portal")), false);
});
