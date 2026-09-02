import assert from 'node:assert/strict'
import test from 'node:test'
import type { SecurityContext } from '../src/pn01/contracts'
import { authoritativeTenantId, canCreateRequest, canReadRequest, canReviewRequest, canWithdrawRequest, canEstablishConsultation, canAssignConsultant, canReadConsultation, canReadConsultationAsRequestOwner, canAdvanceConsultation } from '../src/p2/authorization'
import type { ConsultingRequest, Consultation } from '../src/p2/domain'

const context = (overrides: Partial<SecurityContext> = {}): SecurityContext => ({
  requestId: 'req-1', actorId: 'user-a', actorType: 'authenticated-user', tenantId: 'tenant-a',
  roles: ['ROLE-02'], permissions: [], purpose: 'p2', dataScope: 'synthetic',
  correlationId: 'corr-1', traceId: 'trace-1', membershipId: 'membership-a', authorityVersion: 1,
  ...overrides,
})

const request = (overrides: Partial<ConsultingRequest> = {}): ConsultingRequest => ({
  id: 'req-1', tenantId: 'tenant-a', ownerMembershipId: 'membership-a', title: 't', summary: 's', state: 'REVIEW', version: 1, classification: 'synthetic', ...overrides,
})

const consultation = (overrides: Partial<Consultation> = {}): Consultation => ({
  id: 'con-1', tenantId: 'tenant-a', requestId: 'req-1', managerMembershipId: 'membership-mgr', consultantMembershipId: null, state: 'PROPOSED', version: 1, ...overrides,
})

test('authoritativeTenantId is ALWAYS context.tenantId — proves P2-B: browser cannot override tenant', () => {
  const c = context({ tenantId: 'tenant-real' })
  assert.equal(authoritativeTenantId(c), 'tenant-real')
})

test('P2-A/P2-C role gates: ROLE-02 can create, ROLE-05 can review; neither can do the other', () => {
  assert.equal(canCreateRequest(context({ roles: ['ROLE-02'] })), true)
  assert.equal(canCreateRequest(context({ roles: ['ROLE-05'] })), false)
  assert.equal(canReviewRequest(context({ roles: ['ROLE-05'] }), request()), true)
  assert.equal(canReviewRequest(context({ roles: ['ROLE-02'] }), request()), false)
})

test('P2-D cross-tenant denial: manager from tenant-b cannot review tenant-a request', () => {
  const c = context({ roles: ['ROLE-05'], tenantId: 'tenant-b' })
  assert.equal(canReviewRequest(c, request({ tenantId: 'tenant-a' })), false)
})

test('client can only read/withdraw their OWN request, not another client\'s request in the same tenant', () => {
  const owner = context({ roles: ['ROLE-02'], membershipId: 'membership-a' })
  const other = context({ roles: ['ROLE-02'], membershipId: 'membership-other' })
  assert.equal(canReadRequest(owner, request({ ownerMembershipId: 'membership-a' })), true)
  assert.equal(canReadRequest(other, request({ ownerMembershipId: 'membership-a' })), false)
  assert.equal(canWithdrawRequest(owner, request({ ownerMembershipId: 'membership-a' })), true)
  assert.equal(canWithdrawRequest(other, request({ ownerMembershipId: 'membership-a' })), false)
})

test('manager can read any request in their own tenant regardless of owner', () => {
  const manager = context({ roles: ['ROLE-05'] })
  assert.equal(canReadRequest(manager, request({ ownerMembershipId: 'membership-someone-else' })), true)
})

test('P2-E: consultation can only be established from an ACCEPTED request, by a manager, same tenant', () => {
  const manager = context({ roles: ['ROLE-05'] })
  assert.equal(canEstablishConsultation(manager, request({ state: 'ACCEPTED' })), true)
  assert.equal(canEstablishConsultation(manager, request({ state: 'REVIEW' })), false)
  assert.equal(canEstablishConsultation(context({ roles: ['ROLE-02'] }), request({ state: 'ACCEPTED' })), false)
  assert.equal(canEstablishConsultation(manager, request({ state: 'ACCEPTED', tenantId: 'tenant-other' })), false)
})

test('P2-F: only a manager can assign a consultant; cross-tenant assignment denied', () => {
  assert.equal(canAssignConsultant(context({ roles: ['ROLE-05'] }), consultation()), true)
  assert.equal(canAssignConsultant(context({ roles: ['ROLE-04'] }), consultation()), false)
  assert.equal(canAssignConsultant(context({ roles: ['ROLE-05'], tenantId: 'tenant-x' }), consultation({ tenantId: 'tenant-a' })), false)
})

test('P2-G: assigned consultant can read/advance only their OWN consultation, not an unassigned one', () => {
  const consultant = context({ roles: ['ROLE-04'], membershipId: 'membership-c1' })
  assert.equal(canReadConsultation(consultant, consultation({ consultantMembershipId: 'membership-c1' })), true)
  assert.equal(canReadConsultation(consultant, consultation({ consultantMembershipId: 'membership-c2' })), false)
  assert.equal(canAdvanceConsultation(consultant, consultation({ consultantMembershipId: 'membership-c1' })), true)
  assert.equal(canAdvanceConsultation(consultant, consultation({ consultantMembershipId: null })), false)
})

test('manager can always advance a consultation in their own tenant, regardless of assignment', () => {
  const manager = context({ roles: ['ROLE-05'] })
  assert.equal(canAdvanceConsultation(manager, consultation({ consultantMembershipId: null })), true)
})

test('a synthetic-only role code that does not exist in P1 (e.g. an invented role) is denied everywhere — no independent authority source', () => {
  const forged = context({ roles: ['ROLE-99-INVENTED'] })
  assert.equal(canCreateRequest(forged), false)
  assert.equal(canReviewRequest(forged, request()), false)
  assert.equal(canAssignConsultant(forged, consultation()), false)
})

// P3-A: client (ROLE-02) request-owner consultation-read tests.
const ownedRequest = request({ id: 'req-1', ownerMembershipId: 'membership-client-a', state: 'ACCEPTED' })
const linkedConsultation = consultation({ id: 'con-1', requestId: 'req-1' })

test('A. ROLE-02 request owner can read the consultation linked to their own request', () => {
  const owner = context({ roles: ['ROLE-02'], membershipId: 'membership-client-a' })
  assert.equal(canReadConsultationAsRequestOwner(owner, ownedRequest, linkedConsultation), true)
})

test('B. ROLE-02 cannot read a consultation whose request is owned by a DIFFERENT client in the same tenant', () => {
  const otherClient = context({ roles: ['ROLE-02'], membershipId: 'membership-client-b' })
  assert.equal(canReadConsultationAsRequestOwner(otherClient, ownedRequest, linkedConsultation), false)
})

test('C. ROLE-02 owner cannot read across a tenant boundary even with a matching membershipId string', () => {
  const crossTenant = context({ roles: ['ROLE-02'], membershipId: 'membership-client-a', tenantId: 'tenant-other' })
  assert.equal(canReadConsultationAsRequestOwner(crossTenant, ownedRequest, linkedConsultation), false)
  const crossTenantConsultation = consultation({ id: 'con-1', requestId: 'req-1', tenantId: 'tenant-other' })
  assert.equal(canReadConsultationAsRequestOwner(context({ roles: ['ROLE-02'], membershipId: 'membership-client-a' }), ownedRequest, crossTenantConsultation), false)
})

test('D/F. existing ROLE-05 manager and assigned ROLE-04 consultant reads are completely unaffected by the new owner check (canReadConsultation unchanged)', () => {
  const manager = context({ roles: ['ROLE-05'] })
  const assignedConsultant = context({ roles: ['ROLE-04'], membershipId: 'membership-c1' })
  assert.equal(canReadConsultation(manager, consultation({ consultantMembershipId: null })), true)
  assert.equal(canReadConsultation(assignedConsultant, consultation({ consultantMembershipId: 'membership-c1' })), true)
})

test('E. an unassigned ROLE-04 consultant is still denied (unchanged)', () => {
  const unassigned = context({ roles: ['ROLE-04'], membershipId: 'membership-c-other' })
  assert.equal(canReadConsultation(unassigned, consultation({ consultantMembershipId: 'membership-c1' })), false)
})

test('G. request/consultation mismatch (consultation.requestId does not match the request being checked) is denied even for the true owner', () => {
  const owner = context({ roles: ['ROLE-02'], membershipId: 'membership-client-a' })
  const mismatchedConsultation = consultation({ id: 'con-9', requestId: 'req-9' })
  assert.equal(canReadConsultationAsRequestOwner(owner, ownedRequest, mismatchedConsultation), false)
})

test('a client (ROLE-02) without ownership of the request can never satisfy the owner-read check merely by holding the role', () => {
  const owner = context({ roles: ['ROLE-02'], membershipId: 'membership-different' })
  assert.equal(canReadConsultationAsRequestOwner(owner, ownedRequest, linkedConsultation), false)
})
