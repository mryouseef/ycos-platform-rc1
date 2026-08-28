/** P1-D1 static safety qualification: source-only inspection, no network, no provider call. */
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = async (relative: string) => readFile(path.join(root, relative), 'utf8')

test('P1-D1 static boundaries prohibit provider integration, secrets, destructive migration, and external calls', async () => {
  const identity = await source('src/p1/auth/identity-resolution.ts')
  const context = await source('src/p1/authorization/organization-context.ts')
  const migration = `${await source('infra/p1/migrations/001_identity_foundation.sql')}\n${await source('infra/p1/migrations/002_membership_rls.sql')}`
  const p1Source = `${identity}\n${context}`
  assert.doesNotMatch(p1Source, /@supabase|supabase-js|createClient|auth\.signIn|auth\.getUser/i) // Q27
  assert.doesNotMatch(p1Source, /process\.env|password|access[_-]?token|refresh[_-]?token|service[_-]?role|\.env/i) // Q28
  assert.doesNotMatch(migration, /\bDROP\b|\bTRUNCATE\b|\bDELETE\s+FROM\b|ALTER\s+TABLE\s+public\.work_items|ALTER\s+TABLE\s+public\.migration_history/i) // Q29
  assert.doesNotMatch(p1Source, /\bfetch\s*\(|\bWebSocket\b|\bnet\.connect\b|\bhttp\.request\b|\bhttps\.request\b/i) // Q30; the synthetic issuer is an inert identifier, not a network call.
})
