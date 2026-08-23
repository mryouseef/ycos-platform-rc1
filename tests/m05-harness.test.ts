import test from"node:test";import assert from"node:assert/strict";import{scenario}from"@/src/portal/fixtures";import{canAccessRoute}from"@/src/portal/policy";import{actors}from"@/src/portal/fixtures";
test("TEST-DENY-18 harness allowlist rejects unknown scenarios",()=>assert.equal(scenario("UNKNOWN"),undefined));
test("TEST-DENY-19 harness is disabled outside test environment",()=>{const env=process.env as Record<string,string|undefined>;const before=env.NODE_ENV;env.NODE_ENV="production";assert.equal(scenario("CLIENT_A"),undefined);env.NODE_ENV=before});
test("TEST-DENY-14 hidden admin navigation cannot imply direct route authority",()=>{assert.equal(canAccessRoute(actors.CLIENT_A,"ADMIN"),false);assert.equal(canAccessRoute(actors.CONSULTANT_A,"ORGANIZATION"),false)});
