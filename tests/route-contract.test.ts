import assert from "node:assert/strict";
import test from "node:test";
import { pageMetadata } from "@/src/lib/metadata";
import { publicRoutes } from "@/src/lib/site-data";

const expectedRouteIds = ["R-PUB-01", "R-PUB-02", "R-PUB-03", "R-PUB-04", "R-PUB-05", "R-PUB-06", "R-PUB-08", "R-PUB-09", "R-PUB-10", "R-PUB-11", "R-ENT-01"];

test("M-02 includes each static M-01 public route identifier", () => {
  assert.deepEqual(publicRoutes.map((route) => route.routeId), expectedRouteIds);
});

test("M-02 generates canonical and hreflang metadata for a public route", () => {
  const metadata = pageMetadata("ar", "/services", "الخدمات", "وصف تجريبي");
  assert.equal(metadata.alternates?.canonical, "/ar/services");
  assert.deepEqual(metadata.alternates?.languages, { ar: "/ar/services", en: "/en/services" });
  assert.equal(typeof metadata.robots, "object");
  if (typeof metadata.robots === "object" && metadata.robots !== null) {
    assert.equal(metadata.robots.index, true);
  }
});

test("M-02 marks the portal placeholder as non-indexable", () => {
  const metadata = pageMetadata("en", "/login", "Portal", "Placeholder", true);
  assert.equal(typeof metadata.robots, "object");
  if (typeof metadata.robots === "object" && metadata.robots !== null) {
    assert.equal(metadata.robots.index, false);
    assert.equal(metadata.robots.follow, false);
  }
});
