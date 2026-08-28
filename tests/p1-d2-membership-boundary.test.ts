/** P1-D2B provider-neutral membership tests: verified identity maps to internal P1-D1 authority only. */
import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveVerifiedMembership, type P1InternalUser, type P1Membership, type P1Organization } from '../src/p1/auth/identity-resolution'
import { deriveAuthenticatedOrganizationContext } from '../src/p1/authorization/organization-context'

const user: P1InternalUser = { id: 'usr_p1d2_syn_a', providerIssuer: 'https://auth.p1d2.invalid/auth/v1', providerSubject: 'sub_p1d2_syn_a', status: 'ACTIVE' }
const organization: P1Organization = { id: 'org_p1d2_syn_a', status: 'ACTIVE' }
const membership: P1Membership = { id: 'mem_p1d2_syn_a', userId: user.id, organizationId: organization.id, roleCode: 'ROLE-04', status: 'ACTIVE', authorityVersion: 1 }
const store = { findUser: (issuer: string, subject: string) => issuer === user.providerIssuer && subject === user.providerSubject ? user : undefined, membershipsForUser: (userId: string) => userId === user.id ? [membership] : [], findOrganization: (id: string) => id === organization.id ? organization : undefined }

test('D2-T18 verified provider identity derives the existing internal SecurityContext only after active membership', () => {
  const resolved = resolveVerifiedMembership(store, { providerIssuer: user.providerIssuer, providerSubject: user.providerSubject, organizationHint: organization.id })
  const context = deriveAuthenticatedOrganizationContext(resolved, 'req_p1d2_syn_a')
  assert.equal(context.actorType, 'authenticated-user')
  assert.equal(context.actorId, user.id)
  assert.equal(context.membershipId, membership.id)
  assert.equal(context.tenantId, organization.id)
  assert.deepEqual(context.roles, ['ROLE-04'])
  assert.equal('providerIssuer' in context, false)
  assert.equal('providerSubject' in context, false)
})

test('D2-T19 D2-T23 deny cross-tenant and unknown-identity substitution before any business context', () => {
  assert.throws(() => resolveVerifiedMembership(store, { providerIssuer: user.providerIssuer, providerSubject: user.providerSubject, organizationHint: 'org_p1d2_syn_b' }), /AccessDenied/)
  assert.throws(() => resolveVerifiedMembership(store, { providerIssuer: user.providerIssuer, providerSubject: 'sub_p1d2_syn_b', organizationHint: organization.id }), /AccessDenied/)
  assert.throws(() => resolveVerifiedMembership(store, { providerIssuer: '', providerSubject: user.providerSubject }), /AuthenticationRequired/)
})

test('D2-T13 to D2-T17 current internal status wins over the provider session', () => {
  const disabled = { ...user, status: 'DISABLED' as const }
  const nonActiveMembership = { ...membership, status: 'REVOKED' as const }
  const disabledStore = { ...store, findUser: () => disabled }
  const revokedStore = { ...store, membershipsForUser: () => [nonActiveMembership] }
  assert.throws(() => resolveVerifiedMembership(disabledStore, { providerIssuer: user.providerIssuer, providerSubject: user.providerSubject }), /AccessDenied/)
  assert.throws(() => resolveVerifiedMembership(revokedStore, { providerIssuer: user.providerIssuer, providerSubject: user.providerSubject }), /AccessDenied/)
})
