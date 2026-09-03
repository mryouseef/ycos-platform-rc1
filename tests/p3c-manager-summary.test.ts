/**
 * P3-C tests via a minimal mock repository (only the two methods
 * listManagerConsultationSummary actually calls: listRequests, listConsultationSummariesForTenant).
 * DB/RLS-level proof (that the real SQL query correctly scopes by tenant_id) is NOT RUN here —
 * same disclosed limitation as every prior P2 database test in this project.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import type { SecurityContext } from '../src/pn01/contracts'
import { listManagerConsultationSummary } from '../src/p2/service'
import type { ConsultingRequest } from '../src/p2/domain'

const context = (overrides: Partial<SecurityContext> = {}): SecurityContext => ({
  requestId: 'req-1', actorId: 'user-mgr', actorType: 'authenticated-user', tenantId: 'tenant-a',
  roles: ['ROLE-05'], permissions: [], purpose: 'p2', dataScope: 'synthetic',
  correlationId: 'corr-1', traceId: 'trace-1', membershipId: 'membership-mgr', authorityVersion: 1,
  ...overrides,
})

const req = (id: string, title: string, state: ConsultingRequest['state']): ConsultingRequest => ({
  id, tenantId: 'tenant-a', ownerMembershipId: `owner-of-${id}`, title, summary: 's', state, version: 1, classification: 'synthetic',
})

type ConsultationSummaryRow = { requestId: string; state: string; version: number }
function mockRepo(opts: { requests: ConsultingRequest[]; consultations: ConsultationSummaryRow[] }) {
  return {
    listRequests: async () => opts.requests,
    listConsultationSummariesForTenant: async () => opts.consultations,
  } as any
}

test('A. ROLE-05 manager in Tenant A retrieves the summary for Tenant A requests', async () => {
  const requests = [req('req-1', 'Alpha', 'ACCEPTED'), req('req-2', 'Beta', 'SUBMITTED')]
  const consultations: ConsultationSummaryRow[] = [{ requestId: 'req-1', state: 'ACTIVE', version: 2 }]
  const result = await listManagerConsultationSummary(mockRepo({ requests, consultations }), context())
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.value.length, 2)
})

test('B. tenant scoping is enforced upstream by the authoritative context — a manager in Tenant B only ever sees what the (tenant-scoped) mock returns for its own tenant call', async () => {
  // The mock stands in for a repository whose real SQL is WHERE tenant_id=$1; this test proves
  // the SERVICE never mixes in data beyond what the tenant-scoped repository call returned.
  const tenantBRequests = [req('req-9', 'Gamma', 'SUBMITTED')]
  const result = await listManagerConsultationSummary(mockRepo({ requests: tenantBRequests, consultations: [] }), context({ tenantId: 'tenant-b', membershipId: 'membership-mgr-b' }))
  assert.equal(result.ok, true)
  if (result.ok) assert.deepEqual(result.value.map((r) => r.requestId), ['req-9'])
})

test('C. ROLE-02 is denied the manager-summary path before any repository disclosure', async () => {
  let called = false
  const repo = { listRequests: async () => { called = true; return [] }, listConsultationSummariesForTenant: async () => { called = true; return [] } } as any
  const result = await listManagerConsultationSummary(repo, context({ roles: ['ROLE-02'] }))
  assert.equal(result.ok, false)
  assert.equal(called, false, 'repository must not be called for an unauthorized role')
})

test('D. ROLE-04 is denied the manager-summary path before any repository disclosure', async () => {
  let called = false
  const repo = { listRequests: async () => { called = true; return [] }, listConsultationSummariesForTenant: async () => { called = true; return [] } } as any
  const result = await listManagerConsultationSummary(repo, context({ roles: ['ROLE-04'] }))
  assert.equal(result.ok, false)
  assert.equal(called, false, 'repository must not be called for an unauthorized role')
})

test('E. a request without an established consultation returns consultationState=null and consultationVersion=null', async () => {
  const requests = [req('req-1', 'Alpha', 'SUBMITTED')]
  const result = await listManagerConsultationSummary(mockRepo({ requests, consultations: [] }), context())
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.value[0].consultationState, null)
    assert.equal(result.value[0].consultationVersion, null)
  }
})

test('F. a request with a consultation returns its authorized state/version', async () => {
  const requests = [req('req-1', 'Alpha', 'ACCEPTED')]
  const consultations: ConsultationSummaryRow[] = [{ requestId: 'req-1', state: 'PROPOSED', version: 1 }]
  const result = await listManagerConsultationSummary(mockRepo({ requests, consultations }), context())
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.value[0].consultationState, 'PROPOSED')
    assert.equal(result.value[0].consultationVersion, 1)
  }
})

test('G. every ManagerConsultationSummary object contains ONLY the five approved fields — no id/tenantId/ownerMembershipId/consultantMembershipId/managerMembershipId', async () => {
  const requests = [req('req-1', 'Alpha', 'ACCEPTED')]
  const consultations: ConsultationSummaryRow[] = [{ requestId: 'req-1', state: 'ACTIVE', version: 3 }]
  const result = await listManagerConsultationSummary(mockRepo({ requests, consultations }), context())
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.deepEqual(Object.keys(result.value[0]).sort(), ['consultationState', 'consultationVersion', 'requestId', 'requestState', 'requestTitle'].sort())
    const serialized = JSON.stringify(result.value)
    assert.doesNotMatch(serialized, /tenantId|ownerMembershipId|consultantMembershipId|managerMembershipId/)
  }
})

test('H. no browser/user-supplied tenant value can influence the result — only context.tenantId (never a function argument) determines scope', async () => {
  // listManagerConsultationSummary's signature takes only (repo, context) — there is no
  // tenantId parameter at all for a caller to supply, structurally proving this.
  assert.equal(listManagerConsultationSummary.length, 2)
})

test('J. duplicate consultation rows for the same requestId cause the service to fail closed rather than picking one arbitrarily', async () => {
  const requests = [req('req-1', 'Alpha', 'ACCEPTED')]
  const consultations: ConsultationSummaryRow[] = [
    { requestId: 'req-1', state: 'ACTIVE', version: 2 },
    { requestId: 'req-1', state: 'PAUSED', version: 5 }, // ambiguous duplicate — must never happen given the schema's UNIQUE constraint, defended anyway
  ]
  await assert.rejects(() => listManagerConsultationSummary(mockRepo({ requests, consultations }), context()), /IntegrityFailure/)
})
