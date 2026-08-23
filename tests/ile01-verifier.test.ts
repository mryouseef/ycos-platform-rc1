import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { analyzeArchitecture } from '../scripts/verify_m04_absence.mjs'

const root = process.cwd(); const canonical = 'infra/pn03/migrations/001_work_items.sql'; const ile = 'infra/ile01/migrations/001_ile_rls.sql'
function fixture() { const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ile-verifier-')); for (const file of [canonical, ile]) { const target = path.join(base, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(root, file), target) } fs.writeFileSync(path.join(base, 'package.json'), '{}'); fs.writeFileSync(path.join(base, 'pnpm-lock.yaml'), ''); return base }
test('ILE verifier accepts only the exact authorized RLS migration', () => { const base = fixture(); assert.deepEqual(analyzeArchitecture(base).issues.filter(issue => /MIGRATION/.test(issue.code)), []) })
test('ILE verifier rejects extra, changed canonical, and unexpected migration paths', () => { const extra = fixture(); fs.writeFileSync(path.join(extra, 'infra/ile01/migrations/002_unapproved.sql'), 'select 1'); assert(analyzeArchitecture(extra).issues.some(issue => issue.code === 'UNAUTHORIZED_MIGRATION')); const changed = fixture(); fs.appendFileSync(path.join(changed, canonical), '-- changed'); assert(analyzeArchitecture(changed).issues.some(issue => issue.code === 'CANONICAL_MIGRATION_HASH_MISMATCH')); const unexpected = fixture(); const target = path.join(unexpected, 'infra/unexpected/migrations/001.sql'); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, 'select 1'); assert(analyzeArchitecture(unexpected).issues.some(issue => issue.code === 'UNAUTHORIZED_MIGRATION')) })
