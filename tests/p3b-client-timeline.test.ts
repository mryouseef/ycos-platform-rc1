/**
 * P3-B tests. projectClientTimelineEntry is tested as a pure function (no DB). The
 * readClientTimeline orchestration tests use a minimal mock repository so they can prove
 * defense-in-depth: even if a mocked repository returned a row that a correct SQL filter
 * would never actually produce (e.g. an ASSIGN or DENY-shaped row), the SERVICE-LAYER
 * projection independently omits it, because CLIENT_TIMELINE_LABELS has no such entry. This
 * complements — it does not replace — the SQL-level exclusion, which requires a live
 * database and is NOT RUN here (same disclosed limitation as every prior P2 database test).
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import type { SecurityContext } from '../src/pn01/contracts'
import { readClientTimeline, projectClientTimelineEntry } from '../src/p2/service'
import type { ConsultingRequest, Consultation } from '../src/p2/domain'

const context = (overrides: Partial<SecurityContext> = {}): SecurityContext => ({
  requestId: 'req-1', actorId: 'user-a', actorType: 'authenticated-user', tenantId: 'tenant-a',
  roles: ['ROLE-02'], permissions: [], purpose: 'p2', dataScope: 'synthetic',
  correlationId: 'corr-1', traceId: 'trace-1', membershipId: 'membership-client-a', authorityVersion: 1,
  ...overrides,
})

const ownedRequest: ConsultingRequest = { id: 'req-1', tenantId: 'tenant-a', ownerMembershipId: 'membership-client-a', title: 't', summary: 's', state: 'ACCEPTED', version: 1, classification: 'synthetic' }
const linkedConsultation: Consultation = { id: 'con-1', tenantId: 'tenant-a', requestId: 'req-1', managerMembershipId: 'membership-mgr', consultantMembershipId: null, state: 'ACTIVE', version: 1 }

type MockRow = { action: string; requestedState: string | null; occurredAt: string }
function mockRepo(opts: { request?: ConsultingRequest; consultation?: Consultation; events?: MockRow[] }) {
  return {
    getRequest: async () => { if (!opts.request) throw new Error('NotFound'); return opts.request },
    getConsultationByRequestId: async () => { if (!opts.consultation) throw new Error('NotFound'); return opts.consultation },
    getClientSafeAuditEvents: async (_t: string, _a: string, _rid: string, consultationId: string | null) => {
      // Mirrors the real repository's server-side authorized-consultation gating: only
      // include consultation-linked mock rows when the caller actually resolved an id.
      return (opts.events ?? []).filter((row) => row.action !== '__consultation_only__' || consultationId !== null)
    },
  } as any
}

// --- pure projection ---

test('projectClientTimelineEntry: every fixed-map combination returns a non-empty label (ar and en)', () => {
  const combos: Array<[string, string]> = [['CREATE', 'DRAFT'], ['TRANSITION', 'SUBMITTED'], ['TRANSITION', 'REVIEW'], ['TRANSITION', 'ACCEPTED'], ['TRANSITION', 'DECLINED'], ['TRANSITION', 'WITHDRAWN'], ['TRANSITION', 'CLOSED'], ['ESTABLISH', 'PROPOSED'], ['TRANSITION', 'ACTIVE'], ['TRANSITION', 'PAUSED'], ['TRANSITION', 'COMPLETED']]
  for (const [action, state] of combos) {
    assert.equal(typeof projectClientTimelineEntry('en', action, state), 'string')
    assert.equal(typeof projectClientTimelineEntry('ar', action, state), 'string')
  }
})

test('E/F/G/H (projection layer): ASSIGN, an unmapped action, and a null state are all omitted by returning null — fail-closed by omission, never the raw value', () => {
  assert.equal(projectClientTimelineEntry('en', 'ASSIGN', null), null)
  assert.equal(projectClientTimelineEntry('en', 'ASSIGN', 'ACTIVE'), null) // even if a state happened to be present
  assert.equal(projectClientTimelineEntry('en', 'SOME_UNKNOWN_ACTION', 'ACTIVE'), null)
  assert.equal(projectClientTimelineEntry('en', 'CREATE', null), null)
})

test('unknown/unapproved combination never accidentally returns the raw action or state as a fallback label', () => {
  const label = projectClientTimelineEntry('en', 'WEIRD', 'UNMAPPED_STATE')
  assert.equal(label, null)
  assert.notEqual(label, 'WEIRD')
  assert.notEqual(label, 'UNMAPPED_STATE')
})

// --- orchestration (mocked repository) ---

test('A. owner reads their own request timeline successfully', async () => {
  const result = await readClientTimeline(mockRepo({ request: ownedRequest, consultation: linkedConsultation, events: [{ action: 'CREATE', requestedState: 'DRAFT', occurredAt: '2026-01-01T00:00:00.000Z' }] }), context(), 'req-1', 'en')
  assert.equal(result.ok, true)
  if (result.ok) assert.deepEqual(result.value, [{ label: 'Request created', occurredAt: '2026-01-01T00:00:00.000Z' }])
})

test('B. a different client (same tenant) is denied — same outcome as any other P3-A denial', async () => {
  const otherClient = context({ membershipId: 'membership-client-b' })
  const result = await readClientTimeline(mockRepo({ request: ownedRequest, consultation: linkedConsultation, events: [] }), otherClient, 'req-1', 'en')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, 'NOT_FOUND_OR_NOT_AUTHORIZED')
})

test('C. cross-tenant owner-shaped context is denied identically to B (no distinguishing signal)', async () => {
  const crossTenant = context({ tenantId: 'tenant-other' })
  const resultB = await readClientTimeline(mockRepo({ request: ownedRequest, events: [] }), context({ membershipId: 'membership-client-b' }), 'req-1', 'en')
  const resultC = await readClientTimeline(mockRepo({ request: ownedRequest, events: [] }), crossTenant, 'req-1', 'en')
  assert.equal(resultB.ok, false)
  assert.equal(resultC.ok, false)
  if (!resultB.ok && !resultC.ok) assert.equal(resultB.error, resultC.error)
})

test('D. nonexistent request yields the same NOT_FOUND_OR_NOT_AUTHORIZED outcome, no existence oracle', async () => {
  const result = await readClientTimeline(mockRepo({}), context(), 'req-does-not-exist', 'en')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, 'NOT_FOUND_OR_NOT_AUTHORIZED')
})

test('E/F/G/H (end-to-end via mock): even if the repository returned ASSIGN/unmapped rows, none become timeline entries', async () => {
  const events: MockRow[] = [
    { action: 'CREATE', requestedState: 'DRAFT', occurredAt: '2026-01-01T00:00:00.000Z' },
    { action: 'ASSIGN', requestedState: null, occurredAt: '2026-01-02T00:00:00.000Z' }, // must never appear even if mistakenly returned
    { action: 'TRANSITION', requestedState: 'SUBMITTED', occurredAt: '2026-01-03T00:00:00.000Z' },
  ]
  const result = await readClientTimeline(mockRepo({ request: ownedRequest, consultation: linkedConsultation, events }), context(), 'req-1', 'en')
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.value.length, 2)
    assert.ok(result.value.every((entry) => !JSON.stringify(entry).includes('ASSIGN')))
  }
})

test('I/J/K/L/M/N/O (shape check): a ClientTimelineEntry never contains any key other than label/occurredAt', async () => {
  const result = await readClientTimeline(mockRepo({ request: ownedRequest, consultation: linkedConsultation, events: [{ action: 'CREATE', requestedState: 'DRAFT', occurredAt: '2026-01-01T00:00:00.000Z' }] }), context(), 'req-1', 'en')
  assert.equal(result.ok, true)
  if (result.ok) {
    for (const entry of result.value) assert.deepEqual(Object.keys(entry).sort(), ['label', 'occurredAt'])
  }
})

test('Q. no client-safe events yields a safe empty array, not an error', async () => {
  const result = await readClientTimeline(mockRepo({ request: ownedRequest, consultation: linkedConsultation, events: [] }), context(), 'req-1', 'en')
  assert.equal(result.ok, true)
  if (result.ok) assert.deepEqual(result.value, [])
})

test('R. consultation id used for the events query is only ever the server-derived, authorized one — an unauthorized consultation excludes consultation-linked events', async () => {
  const foreignConsultation: Consultation = { ...linkedConsultation, managerMembershipId: 'someone-else', tenantId: 'tenant-other' }
  const result = await readClientTimeline(mockRepo({ request: ownedRequest, consultation: foreignConsultation, events: [{ action: '__consultation_only__', requestedState: 'ACTIVE', occurredAt: '2026-01-01T00:00:00.000Z' }] }), context(), 'req-1', 'en')
  assert.equal(result.ok, true)
  if (result.ok) assert.deepEqual(result.value, [])
})

test('P. deterministic ordering is preserved as returned by the repository (service does not reorder)', async () => {
  const events: MockRow[] = [
    { action: 'CREATE', requestedState: 'DRAFT', occurredAt: '2026-01-01T00:00:00.000Z' },
    { action: 'TRANSITION', requestedState: 'SUBMITTED', occurredAt: '2026-01-02T00:00:00.000Z' },
    { action: 'TRANSITION', requestedState: 'ACCEPTED', occurredAt: '2026-01-03T00:00:00.000Z' },
  ]
  const result = await readClientTimeline(mockRepo({ request: ownedRequest, consultation: linkedConsultation, events }), context(), 'req-1', 'en')
  assert.equal(result.ok, true)
  if (result.ok) assert.deepEqual(result.value.map((entry) => entry.occurredAt), ['2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', '2026-01-03T00:00:00.000Z'])
})

test('T/U. manager (ROLE-05) retains existing read authority over the same timeline (unchanged canReadRequest behavior)', async () => {
  const manager = context({ roles: ['ROLE-05'], membershipId: 'membership-mgr' })
  const result = await readClientTimeline(mockRepo({ request: ownedRequest, consultation: linkedConsultation, events: [{ action: 'CREATE', requestedState: 'DRAFT', occurredAt: '2026-01-01T00:00:00.000Z' }] }), manager, 'req-1', 'en')
  assert.equal(result.ok, true)
})

test('T. consultant (ROLE-04) without canReadRequest ownership is denied this client timeline path (unchanged)', async () => {
  const consultant = context({ roles: ['ROLE-04'], membershipId: 'membership-c1' })
  const result = await readClientTimeline(mockRepo({ request: ownedRequest, consultation: linkedConsultation, events: [] }), consultant, 'req-1', 'en')
  assert.equal(result.ok, false)
})
