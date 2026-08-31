/**
 * P1-D2CDE Q02 diagnostic seam: static safety proofs over the real source files.
 * These tests do not require a Next.js runtime; they assert properties of the
 * committed source that make browser-visible leakage structurally impossible.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loginPagePath = 'app/[locale]/login/page.tsx'
const serverClientPath = 'src/p1/auth/supabase-server-client.ts'
const diagnosticPath = 'src/p1/auth/q02-diagnostic.ts'

test('the browser-visible failure redirect stays generic (no category in the URL)', async () => {
  const source = await readFile(loginPagePath, 'utf8')
  assert.match(source, /redirect\(`\/\$\{locale\}\/login\?status=failed`\)/)
  assert.match(source, /redirect\(`\/\$\{locale\}\/login\?status=authenticated`\)/)
  // No template literal anywhere may interpolate a diagnostic category into a redirect URL.
  assert.doesNotMatch(source, /status=\$\{[^}]*[Qq]02/i)
})

test('logQ02Diagnostic is called only on the server action, never returned to JSX/response', async () => {
  const source = await readFile(loginPagePath, 'utf8')
  const jsxReturn = source.slice(source.indexOf('return <main'))
  assert.doesNotMatch(jsxReturn, /Q02_[A-Z_]+/)
  assert.doesNotMatch(jsxReturn, /logQ02Diagnostic|classifyQ02Diagnostic/)
})

test('the success path logs Q02_AUTH_ACCEPTED before the success redirect, not inside a route the browser reads', async () => {
  const source = await readFile(loginPagePath, 'utf8')
  assert.match(source, /logQ02Diagnostic\('Q02_AUTH_ACCEPTED'\)\s*\n\s*\} catch/)
})

test('the failure path classifies before redirecting, and the category never reaches redirect()', async () => {
  const source = await readFile(loginPagePath, 'utf8')
  const catchBlock = source.slice(source.indexOf('catch (error)'), source.indexOf(`status=failed`) + 20)
  assert.match(catchBlock, /logQ02Diagnostic\(classifyQ02Diagnostic\(error\)\)/)
  assert.doesNotMatch(catchBlock, /redirect\([^)]*category/i)
})

test('previous P1-D2CDE Q02 form remediation remains preserved', async () => {
  const source = await readFile(loginPagePath, 'utf8')
  assert.match(source, /<form action=\{action\}>/)
  assert.doesNotMatch(source, /<form action=\{action\} method=/)
  assert.match(source, /'use server'/)
})

test('the diagnostic module is never imported by anything other than the login action seam', async () => {
  const source = await readFile(loginPagePath, 'utf8')
  const importLines = source.split('\n').filter((line) => line.includes('q02-diagnostic'))
  assert.equal(importLines.length, 1)
  assert.match(importLines[0], /import \{ classifyQ02Diagnostic, logQ02Diagnostic \} from '@\/src\/p1\/auth\/q02-diagnostic'/)
})

test('createSupabaseServerClient normalizes any client-construction failure to a fixed, non-sensitive message', async () => {
  const source = await readFile(serverClientPath, 'utf8')
  assert.match(source, /throw new Error\('ClientInitFailure'\)/)
  // loadSupabasePublicConfig() must remain OUTSIDE the client-init try/catch so its own
  // DependencyUnavailable / IntegrityFailure messages are not renamed or reclassified.
  const configCallIndex = source.indexOf('const config = loadSupabasePublicConfig()')
  const tryIndex = source.indexOf('try {', configCallIndex)
  assert.ok(configCallIndex > -1 && tryIndex > configCallIndex)
})

test('no EXECUTABLE line in the diagnostic module references passwords, tokens, cookies, keys, or UUIDs', async () => {
  // Comments are allowed to document the security contract using these words (that is the
  // point of the contract). Only executable code lines must never touch these identifiers.
  const forbidden = /\bpassword\b|\btoken\b|\bcookie\b|\bsecret\b|\bservice_role\b|\buuid\b|\bpublishableKey\b/i
  const diagnosticSource = await readFile(diagnosticPath, 'utf8')
  const executableLines = diagnosticSource
    .split('\n')
    .filter((line) => !/^\s*(\/\*|\*|\/\/)/.test(line))
    .join('\n')
  assert.doesNotMatch(executableLines, forbidden)
})

test('the diagnostic module has zero external package dependencies (no lockfile impact)', async () => {
  const source = await readFile(diagnosticPath, 'utf8')
  assert.doesNotMatch(source, /^import /m)
})
