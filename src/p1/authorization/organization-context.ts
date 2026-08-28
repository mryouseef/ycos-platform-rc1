/**
 * P1-D1 security contract: derive a synthetic SecurityContext on the server.
 * Tenant and role are read from a resolved membership; browser input is never authority.
 */
import type { SecurityContext } from '../../pn01/contracts'
import type { ResolvedSyntheticMembership } from '../auth/identity-resolution'

export function deriveSyntheticOrganizationContext(resolved: ResolvedSyntheticMembership, requestId: string): SecurityContext {
  if (!requestId || resolved.membership.status !== 'ACTIVE' || resolved.organization.id !== resolved.membership.organizationId) throw new Error('ScopeViolation')
  return {
    requestId,
    actorId: resolved.user.id,
    actorType: 'synthetic-user',
    tenantId: resolved.organization.id,
    roles: [resolved.membership.roleCode],
    permissions: ['work-item'],
    purpose: 'work-item',
    dataScope: 'synthetic',
    correlationId: `p1-${requestId}`,
    traceId: `p1-trace-${requestId}`,
    membershipId: resolved.membership.id,
    authorityVersion: resolved.membership.authorityVersion,
  }
}
