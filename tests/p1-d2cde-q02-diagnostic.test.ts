/** P1-D2CDE Q02 diagnostic seam: pure classification/logging contract tests. */
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyQ02Diagnostic,
  logQ02Diagnostic,
  type Q02DiagnosticCategory,
} from '../src/p1/auth/q02-diagnostic'

test('DependencyUnavailable classifies as Q02_CONFIG_REJECTED', () => {
  assert.equal(classifyQ02Diagnostic(new Error('DependencyUnavailable')), 'Q02_CONFIG_REJECTED')
})

test('IntegrityFailure classifies as Q02_CONFIG_REJECTED', () => {
  assert.equal(classifyQ02Diagnostic(new Error('IntegrityFailure')), 'Q02_CONFIG_REJECTED')
})

test('ClientInitFailure classifies as Q02_CLIENT_INIT_REJECTED', () => {
  assert.equal(classifyQ02Diagnostic(new Error('ClientInitFailure')), 'Q02_CLIENT_INIT_REJECTED')
})

test('AuthenticationRequired classifies as Q02_PROVIDER_AUTH_REJECTED', () => {
  assert.equal(classifyQ02Diagnostic(new Error('AuthenticationRequired')), 'Q02_PROVIDER_AUTH_REJECTED')
})

test('an unrecognized Error message classifies as Q02_UNEXPECTED_REJECTED (no guessing)', () => {
  assert.equal(classifyQ02Diagnostic(new Error('SomeNewSupabaseSdkInternalError')), 'Q02_UNEXPECTED_REJECTED')
})

test('a non-Error thrown value classifies as Q02_UNEXPECTED_REJECTED', () => {
  assert.equal(classifyQ02Diagnostic('a raw string throw'), 'Q02_UNEXPECTED_REJECTED')
  assert.equal(classifyQ02Diagnostic(undefined), 'Q02_UNEXPECTED_REJECTED')
  assert.equal(classifyQ02Diagnostic({ message: 'AuthenticationRequired' }), 'Q02_UNEXPECTED_REJECTED')
})

test('classification never leaks the original error message into its return value', () => {
  const secretLikeMessage = 'password=hunter2 token=abc.def.ghi cookie=sid-9f8e'
  const category = classifyQ02Diagnostic(new Error(secretLikeMessage))
  assert.equal(category, 'Q02_UNEXPECTED_REJECTED')
  assert.doesNotMatch(category, /hunter2|token|cookie|sid-9f8e/i)
})

test('exactly five diagnostic categories exist and each is reachable', () => {
  const reachable = new Set<Q02DiagnosticCategory>([
    classifyQ02Diagnostic(new Error('DependencyUnavailable')),
    classifyQ02Diagnostic(new Error('IntegrityFailure')),
    classifyQ02Diagnostic(new Error('ClientInitFailure')),
    classifyQ02Diagnostic(new Error('AuthenticationRequired')),
    classifyQ02Diagnostic(new Error('unknown')),
    'Q02_AUTH_ACCEPTED', // emitted directly by the login action on success, not via classifyQ02Diagnostic
  ])
  assert.deepEqual(
    [...reachable].sort(),
    [
      'Q02_AUTH_ACCEPTED',
      'Q02_CLIENT_INIT_REJECTED',
      'Q02_CONFIG_REJECTED',
      'Q02_PROVIDER_AUTH_REJECTED',
      'Q02_UNEXPECTED_REJECTED',
    ].sort(),
  )
})

test('logQ02Diagnostic emits exactly one fixed tag plus the category, nothing else', () => {
  const calls: unknown[][] = []
  const original = console.error
  console.error = (...args: unknown[]) => { calls.push(args) }
  try {
    logQ02Diagnostic('Q02_PROVIDER_AUTH_REJECTED')
  } finally {
    console.error = original
  }
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0], ['[Q02_DIAGNOSTIC]', 'Q02_PROVIDER_AUTH_REJECTED'])
})

test('logQ02Diagnostic source accepts no parameter beyond the closed category union (type-level proof)', async () => {
  const { readFile } = await import('node:fs/promises')
  const source = await readFile(new URL('../src/p1/auth/q02-diagnostic.ts', import.meta.url), 'utf8')
  assert.match(source, /export function logQ02Diagnostic\(category: Q02DiagnosticCategory\): void/)
  // The sink must not reference any error/credential/token/cookie identifier in EXECUTABLE code.
  // Comments are allowed to name these words while documenting the guarantee itself.
  const executableLines = source
    .split('\n')
    .filter((line) => !/^\s*(\/\*|\*|\/\/)/.test(line))
    .join('\n')
  assert.doesNotMatch(executableLines, /password|email|token|cookie|uuid|secret|service_role|FormData/i)
})
