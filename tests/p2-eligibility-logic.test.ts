/**
 * These tests exercise a pure TypeScript mirror of the exact predicate implemented in
 * infra/p2/migrations/002_membership_eligibility_authority.sql's (R01B, single-argument
 * signature) public.p2_is_consultant_membership_eligible(target_membership_id) function
 * body. They do not touch a database — they exist so the ELIGIBILITY LOGIC itself (not the
 * SQL runtime) is proven correct and regression-tested before the migration is ever applied.
 * The SQL function's actual behavior against a live database is NOT verified by this file —
 * see tests/p2-eligibility-integration.test.ts and the R01B remediation report for that.
 */
import assert from 'node:assert/strict'
import test from 'node:test'

type Membership = { id: string; userId: string; organizationId: string; roleCode: string; status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED' }

/** Mirrors the SQL function body exactly (R01B signature: single target argument; tenant/actor
 * are derived from the transaction, never passed in). Actor must additionally carry ROLE-05. */
function isConsultantMembershipEligible(memberships: readonly Membership[], authoritativeTenant: string, authoritativeActor: string, targetMembershipId: string): boolean {
  if (!authoritativeTenant || !authoritativeActor || !targetMembershipId) return false
  const actorAuthorized = memberships.some((m) => m.userId === authoritativeActor && m.organizationId === authoritativeTenant && m.status === 'ACTIVE' && m.roleCode === 'ROLE-05')
  if (!actorAuthorized) return false
  return memberships.some((m) => m.id === targetMembershipId && m.organizationId === authoritativeTenant && m.status === 'ACTIVE' && m.roleCode === 'ROLE-04')
}

const fixtures: Membership[] = [
  { id: 'mem-mgr-a', userId: 'user-mgr-a', organizationId: 'tenant-a', roleCode: 'ROLE-05', status: 'ACTIVE' },
  { id: 'mem-consultant-a-active', userId: 'user-c1', organizationId: 'tenant-a', roleCode: 'ROLE-04', status: 'ACTIVE' },
  { id: 'mem-consultant-a-suspended', userId: 'user-c2', organizationId: 'tenant-a', roleCode: 'ROLE-04', status: 'SUSPENDED' },
  { id: 'mem-consultant-a-revoked', userId: 'user-c3', organizationId: 'tenant-a', roleCode: 'ROLE-04', status: 'REVOKED' },
  { id: 'mem-client-a', userId: 'user-c4', organizationId: 'tenant-a', roleCode: 'ROLE-02', status: 'ACTIVE' },
  { id: 'mem-consultant-b-active', userId: 'user-c5', organizationId: 'tenant-b', roleCode: 'ROLE-04', status: 'ACTIVE' },
  { id: 'mem-mgr-a-suspended', userId: 'user-mgr-suspended', organizationId: 'tenant-a', roleCode: 'ROLE-05', status: 'SUSPENDED' },
]

test('1. eligible same-tenant ACTIVE ROLE-04 -> true', () => {
  assert.equal(isConsultantMembershipEligible(fixtures, 'tenant-a', 'user-mgr-a', 'mem-consultant-a-active'), true)
})

test('2. nonexistent target -> false', () => {
  assert.equal(isConsultantMembershipEligible(fixtures, 'tenant-a', 'user-mgr-a', 'mem-does-not-exist'), false)
})

test('3. foreign-tenant ACTIVE ROLE-04 -> false (cross-tenant denied)', () => {
  assert.equal(isConsultantMembershipEligible(fixtures, 'tenant-a', 'user-mgr-a', 'mem-consultant-b-active'), false)
})

test('4. same-tenant wrong role (ROLE-02) -> false', () => {
  assert.equal(isConsultantMembershipEligible(fixtures, 'tenant-a', 'user-mgr-a', 'mem-client-a'), false)
})

test('5. same-tenant ROLE-04 SUSPENDED -> false', () => {
  assert.equal(isConsultantMembershipEligible(fixtures, 'tenant-a', 'user-mgr-a', 'mem-consultant-a-suspended'), false)
})

test('6. same-tenant ROLE-04 REVOKED -> false', () => {
  assert.equal(isConsultantMembershipEligible(fixtures, 'tenant-a', 'user-mgr-a', 'mem-consultant-a-revoked'), false)
})

test('7. unauthorized/non-authoritative actor (actor membership not ACTIVE) -> false regardless of valid target', () => {
  assert.equal(isConsultantMembershipEligible(fixtures, 'tenant-a', 'user-mgr-suspended', 'mem-consultant-a-active'), false)
})

test('F. R01B: ACTIVE actor WITHOUT ROLE-05 (e.g. a client, ROLE-02) cannot use the primitive even for a valid target', () => {
  assert.equal(isConsultantMembershipEligible(fixtures, 'tenant-a', 'user-c4', 'mem-consultant-a-active'), false)
})

test('13. cross-tenant probing: foreign-tenant target and same-tenant target that does not exist return the SAME false — no existence disclosure signal in the boolean itself', () => {
  const foreignTenant = isConsultantMembershipEligible(fixtures, 'tenant-a', 'user-mgr-a', 'mem-consultant-b-active')
  const nonexistent = isConsultantMembershipEligible(fixtures, 'tenant-a', 'user-mgr-a', 'mem-does-not-exist')
  assert.equal(foreignTenant, false)
  assert.equal(nonexistent, false)
  assert.equal(foreignTenant, nonexistent)
})

test('empty/malformed inputs are rejected before any membership comparison', () => {
  assert.equal(isConsultantMembershipEligible(fixtures, '', 'user-mgr-a', 'mem-consultant-a-active'), false)
  assert.equal(isConsultantMembershipEligible(fixtures, 'tenant-a', '', 'mem-consultant-a-active'), false)
  assert.equal(isConsultantMembershipEligible(fixtures, 'tenant-a', 'user-mgr-a', ''), false)
})
