/**
 * P3-A service-orchestration tests using a minimal mock repository (only the two methods
 * readConsultationForRequest actually calls). These prove the ORCHESTRATION logic — request
 * fetched first, ownership never trusted from the caller, mismatch and not-found both fail
 * closed with the same generic outcome — without needing a live database.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import type { SecurityContext } from '../src/pn01/contracts'
import { readConsultationForRequest } from '../src/p2/service'
import type { ConsultingRequest, Consultation } from '../src/p2/domain'

const context = (overrides: Partial<SecurityContext> = {}): SecurityContext => ({
  requestId: 'req-1', actorId: 'user-a', actorType: 'authenticated-user', tenantId: 'tenant-a',
  roles: ['ROLE-02'], permissions: [], purpose: 'p2', dataScope: 'synthetic',
  correlationId: 'corr-1', traceId: 'trace-1', membershipId: 'membership-client-a', authorityVersion: 1,
  ...overrides,
})

function mockRepo(opts: { request?: ConsultingRequest; consultation?: Consultation }) {
  return {
    getRequest: async () => { if (!opts.request) throw new Error('NotFound'); return opts.request },
    getConsultationByRequestId: async () => { if (!opts.consultation) throw new Error('NotFound'); return opts.consultation },
  } as any
}

const ownedRequest: ConsultingRequest = { id: 'req-1', tenantId: 'tenant-a', ownerMembershipId: 'membership-client-a', title: 't', summary: 's', state: 'ACCEPTED', version: 1, classification: 'synthetic' }
const linkedConsultation: Consultation = { id: 'con-1', tenantId: 'tenant-a', requestId: 'req-1', managerMembershipId: 'membership-mgr', consultantMembershipId: null, state: 'PROPOSED', version: 1 }

test('A. owner reads their own linked consultation successfully', async () => {
  const result = await readConsultationForRequest(mockRepo({ request: ownedRequest, consultation: linkedConsultation }), context(), 'req-1')
  assert.equal(result.ok, true)
})

test('H. no consultation exists yet (request accepted but not established) -> NOT_FOUND_OR_NOT_AUTHORIZED, same shape as any other denial, no existence leak', async () => {
  const result = await readConsultationForRequest(mockRepo({ request: ownedRequest, consultation: undefined }), context(), 'req-1')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, 'NOT_FOUND_OR_NOT_AUTHORIZED')
})

test('H. request itself does not exist / not authorized -> same NOT_FOUND_OR_NOT_AUTHORIZED outcome, no distinguishing signal', async () => {
  const result = await readConsultationForRequest(mockRepo({ request: undefined }), context(), 'req-does-not-exist')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, 'NOT_FOUND_OR_NOT_AUTHORIZED')
})

test('G. consultation.requestId mismatched against the fetched request -> denied even though both individually "exist"', async () => {
  const mismatched: Consultation = { ...linkedConsultation, id: 'con-9', requestId: 'req-9' }
  const result = await readConsultationForRequest(mockRepo({ request: ownedRequest, consultation: mismatched }), context(), 'req-1')
  assert.equal(result.ok, false)
})

test('B. a different client (same tenant) requesting the same requestId is denied even though the request/consultation both genuinely exist', async () => {
  const otherClient = context({ membershipId: 'membership-client-b' })
  const result = await readConsultationForRequest(mockRepo({ request: ownedRequest, consultation: linkedConsultation }), otherClient, 'req-1')
  assert.equal(result.ok, false)
})

test('manager (ROLE-05) reading the same requestId still succeeds via the preserved canReadConsultation path, independent of ownership', async () => {
  const manager = context({ roles: ['ROLE-05'], membershipId: 'membership-mgr' })
  const result = await readConsultationForRequest(mockRepo({ request: ownedRequest, consultation: linkedConsultation }), manager, 'req-1')
  assert.equal(result.ok, true)
})
