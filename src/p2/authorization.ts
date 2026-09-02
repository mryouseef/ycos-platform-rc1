/**
 * P2 authorization adapter — P2-ADR-001 Section 8.
 *
 * The ONLY accepted authority input is the qualified P1 SecurityContext
 * (src/pn01/contracts.ts), derived server-side by
 * deriveProviderBackedSecurityContext() / deriveAuthenticatedOrganizationContext().
 * This module never accepts src/portal/policy.ts's synthetic Actor, a
 * client-supplied role, or a client-supplied tenant. It does not create an
 * independent source of authority — it only narrows SecurityContext.roles /
 * SecurityContext.tenantId into P2-specific ALLOW/DENY decisions.
 *
 * Role vocabulary reused as-is from P1 (ROLE-02..ROLE-08), evidenced by
 * src/portal/policy.ts's REQUESTS/CONSULTANT_DASHBOARD mapping:
 *   ROLE-02 = client (request owner)
 *   ROLE-05 = manager/project authority (review, accept/reject, establish, assign)
 *   ROLE-04 = consultant (assignable, advances an assigned consultation)
 */

import type { SecurityContext } from '../pn01/contracts'
import type { ConsultingRequest, Consultation } from './domain'

const CLIENT_ROLE = 'ROLE-02'
const MANAGER_ROLE = 'ROLE-05'
const CONSULTANT_ROLE = 'ROLE-04'

function hasRole(context: SecurityContext, role: string): boolean {
  return Array.isArray(context.roles) && context.roles.includes(role)
}

/** The tenant a persistent P2 record belongs to is ALWAYS context.tenantId — never a client-supplied value. */
export function authoritativeTenantId(context: SecurityContext): string {
  return context.tenantId
}

export function canCreateRequest(context: SecurityContext): boolean {
  return hasRole(context, CLIENT_ROLE)
}

export function canReadRequest(context: SecurityContext, request: ConsultingRequest): boolean {
  if (request.tenantId !== context.tenantId) return false
  if (hasRole(context, MANAGER_ROLE)) return true
  return hasRole(context, CLIENT_ROLE) && request.ownerMembershipId === context.membershipId
}

export function canReviewRequest(context: SecurityContext, request: ConsultingRequest): boolean {
  return request.tenantId === context.tenantId && hasRole(context, MANAGER_ROLE)
}

export function canWithdrawRequest(context: SecurityContext, request: ConsultingRequest): boolean {
  return request.tenantId === context.tenantId && hasRole(context, CLIENT_ROLE) && request.ownerMembershipId === context.membershipId
}

export function canEstablishConsultation(context: SecurityContext, request: ConsultingRequest): boolean {
  return request.tenantId === context.tenantId && hasRole(context, MANAGER_ROLE) && request.state === 'ACCEPTED'
}

export function canAssignConsultant(context: SecurityContext, consultation: Consultation): boolean {
  return consultation.tenantId === context.tenantId && hasRole(context, MANAGER_ROLE)
}

export function canReadConsultation(context: SecurityContext, consultation: Consultation): boolean {
  if (consultation.tenantId !== context.tenantId) return false
  if (hasRole(context, MANAGER_ROLE)) return true
  if (hasRole(context, CONSULTANT_ROLE) && consultation.consultantMembershipId === context.membershipId) return true
  return false
}

/**
 * P3-A: additive-only. The client (ROLE-02) who owns the ORIGINATING request may read the
 * consultation established from it — and ONLY that consultation. This is a narrow,
 * request-ownership-scoped check, deliberately kept separate from canReadConsultation()
 * above (which is unchanged) rather than folded into it, per P3-A's "do not generalize the
 * policy" instruction. All four conditions are required:
 * - the request itself belongs to the authoritative tenant;
 * - the request is owned by the acting client's own membership (never client-supplied);
 * - the consultation's requestId actually matches this request (no mismatch substitution);
 * - the consultation belongs to the same authoritative tenant.
 */
export function canReadConsultationAsRequestOwner(context: SecurityContext, request: ConsultingRequest, consultation: Consultation): boolean {
  return (
    hasRole(context, CLIENT_ROLE) &&
    request.tenantId === context.tenantId &&
    consultation.tenantId === context.tenantId &&
    request.ownerMembershipId === context.membershipId &&
    consultation.requestId === request.id
  )
}

export function canAdvanceConsultation(context: SecurityContext, consultation: Consultation): boolean {
  if (consultation.tenantId !== context.tenantId) return false
  if (hasRole(context, MANAGER_ROLE)) return true
  return hasRole(context, CONSULTANT_ROLE) && consultation.consultantMembershipId === context.membershipId
}
