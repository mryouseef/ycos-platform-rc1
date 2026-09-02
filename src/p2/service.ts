/**
 * P2 application command/query facade.
 * Route / Server Action → (this file) → domain policy/lifecycle → repository → response.
 * Every function requires a real SecurityContext as its first argument; none accept a
 * client-supplied tenant, role, or actor. This is the only layer that decides ALLOW/DENY.
 *
 * R01 correction: successful mutations now audit atomically inside the repository's own
 * transaction (see repository.ts). This file only calls repo.appendDenialAudit(...) for
 * DENY/CONFLICT outcomes, since there is no mutation for those to be atomic with.
 */
import type { SecurityContext } from '../pn01/contracts'
import type { P2PostgresRepository } from './repository'
import { boundedTitle, boundedSummary, isRequestTransitionAllowed, isConsultationTransitionAllowed, type RequestState, type ConsultationState, type ConsultingRequest, type Consultation, type Outcome } from './domain'
import { authoritativeTenantId, canCreateRequest, canReadRequest, canReviewRequest, canWithdrawRequest, canEstablishConsultation, canAssignConsultant, canReadConsultation, canReadConsultationAsRequestOwner, canAdvanceConsultation } from './authorization'

const requireActor = (context: SecurityContext): string => {
  if (!context.tenantId || !context.actorId || !context.membershipId) throw new Error('IntegrityFailure')
  return context.actorId
}

export async function createRequest(repo: P2PostgresRepository, context: SecurityContext, input: { id: string; title: string; summary: string; idempotencyKey: string }): Promise<Outcome<{ duplicate: boolean; request: ConsultingRequest }>> {
  const actorId = requireActor(context)
  const tenantId = authoritativeTenantId(context)
  if (!canCreateRequest(context)) {
    await repo.appendDenialAudit(tenantId, actorId, { actorId, action: 'CREATE', resourceType: 'request', resourceId: input.id, outcome: 'DENY', reasonCode: 'ACTION_NOT_AUTHORIZED', correlationId: context.correlationId })
    return { ok: false, error: 'ACTION_NOT_AUTHORIZED' }
  }
  if (!boundedTitle(input.title) || !boundedSummary(input.summary)) {
    return { ok: false, error: 'VALIDATION_ERROR' }
  }
  const result = await repo.createRequest(tenantId, actorId, { id: input.id, ownerMembershipId: context.membershipId!, title: input.title.trim(), summary: input.summary.trim(), idempotencyKey: input.idempotencyKey, correlationId: context.correlationId })
  return { ok: true, value: result }
}

export async function readRequest(repo: P2PostgresRepository, context: SecurityContext, id: string): Promise<Outcome<ConsultingRequest>> {
  const actorId = requireActor(context)
  const tenantId = authoritativeTenantId(context)
  const request = await repo.getRequest(tenantId, actorId, id).catch((error) => { if (error instanceof Error && error.message === 'NotFound') return undefined; throw error })
  if (!request || !canReadRequest(context, request)) return { ok: false, error: 'NOT_FOUND_OR_NOT_AUTHORIZED' }
  return { ok: true, value: request }
}

export async function listMyRequests(repo: P2PostgresRepository, context: SecurityContext): Promise<Outcome<ConsultingRequest[]>> {
  const actorId = requireActor(context)
  const tenantId = authoritativeTenantId(context)
  const isManager = context.roles.includes('ROLE-05')
  const rows = await repo.listRequests(tenantId, actorId, isManager ? undefined : context.membershipId)
  return { ok: true, value: rows }
}

export async function listMyConsultations(repo: P2PostgresRepository, context: SecurityContext): Promise<Outcome<Consultation[]>> {
  const actorId = requireActor(context)
  const tenantId = authoritativeTenantId(context)
  if (!context.roles.includes('ROLE-04')) return { ok: true, value: [] }
  const rows = await repo.listConsultationsForConsultant(tenantId, actorId, context.membershipId!)
  return { ok: true, value: rows }
}

async function transitionRequestGuarded(repo: P2PostgresRepository, context: SecurityContext, id: string, expectedVersion: number, target: RequestState, allowed: (context: SecurityContext, request: ConsultingRequest) => boolean): Promise<Outcome<ConsultingRequest>> {
  const actorId = requireActor(context)
  const tenantId = authoritativeTenantId(context)
  const current = await repo.getRequest(tenantId, actorId, id).catch((error) => { if (error instanceof Error && error.message === 'NotFound') return undefined; throw error })
  if (!current) return { ok: false, error: 'NOT_FOUND_OR_NOT_AUTHORIZED' }
  if (!allowed(context, current)) {
    await repo.appendDenialAudit(tenantId, actorId, { actorId, action: 'TRANSITION', resourceType: 'request', resourceId: id, outcome: 'DENY', reasonCode: 'ACTION_NOT_AUTHORIZED', correlationId: context.correlationId, previousState: current.state, requestedState: target })
    return { ok: false, error: 'ACTION_NOT_AUTHORIZED' }
  }
  if (!isRequestTransitionAllowed(current.state, target)) return { ok: false, error: 'STATE_TRANSITION_NOT_ALLOWED' }
  const updated = await repo.transitionRequest(tenantId, actorId, id, expectedVersion, target, context.correlationId, current.state).catch((error) => { if (error instanceof Error && error.message === 'ConcurrencyFailure') return undefined; throw error })
  if (!updated) return { ok: false, error: 'VERSION_CONFLICT' }
  return { ok: true, value: updated }
}

export const submitRequest = (repo: P2PostgresRepository, context: SecurityContext, id: string, expectedVersion: number) => transitionRequestGuarded(repo, context, id, expectedVersion, 'SUBMITTED', canWithdrawRequest)
export const withdrawRequest = (repo: P2PostgresRepository, context: SecurityContext, id: string, expectedVersion: number) => transitionRequestGuarded(repo, context, id, expectedVersion, 'WITHDRAWN', canWithdrawRequest)
export const startReview = (repo: P2PostgresRepository, context: SecurityContext, id: string, expectedVersion: number) => transitionRequestGuarded(repo, context, id, expectedVersion, 'REVIEW', canReviewRequest)
export const acceptRequest = (repo: P2PostgresRepository, context: SecurityContext, id: string, expectedVersion: number) => transitionRequestGuarded(repo, context, id, expectedVersion, 'ACCEPTED', canReviewRequest)
export const declineRequest = (repo: P2PostgresRepository, context: SecurityContext, id: string, expectedVersion: number) => transitionRequestGuarded(repo, context, id, expectedVersion, 'DECLINED', canReviewRequest)
export const closeRequest = (repo: P2PostgresRepository, context: SecurityContext, id: string, expectedVersion: number) => transitionRequestGuarded(repo, context, id, expectedVersion, 'CLOSED', canReviewRequest)

export async function establishConsultation(repo: P2PostgresRepository, context: SecurityContext, input: { id: string; requestId: string }): Promise<Outcome<Consultation>> {
  const actorId = requireActor(context)
  const tenantId = authoritativeTenantId(context)
  const request = await repo.getRequest(tenantId, actorId, input.requestId).catch((error) => { if (error instanceof Error && error.message === 'NotFound') return undefined; throw error })
  if (!request) return { ok: false, error: 'NOT_FOUND_OR_NOT_AUTHORIZED' }
  if (!canEstablishConsultation(context, request)) {
    await repo.appendDenialAudit(tenantId, actorId, { actorId, action: 'ESTABLISH', resourceType: 'consultation', resourceId: input.id, outcome: 'DENY', reasonCode: 'ACTION_NOT_AUTHORIZED', correlationId: context.correlationId })
    return { ok: false, error: 'ACTION_NOT_AUTHORIZED' }
  }
  const consultation = await repo.establishConsultation(tenantId, actorId, { id: input.id, requestId: input.requestId, managerMembershipId: context.membershipId!, correlationId: context.correlationId }).catch((error) => { if (error instanceof Error && error.message === 'ALREADY_ESTABLISHED') return undefined; throw error })
  if (!consultation) {
    await repo.appendDenialAudit(tenantId, actorId, { actorId, action: 'ESTABLISH', resourceType: 'consultation', resourceId: input.id, outcome: 'CONFLICT', reasonCode: 'ALREADY_ESTABLISHED', correlationId: context.correlationId })
    return { ok: false, error: 'ALREADY_ESTABLISHED' }
  }
  return { ok: true, value: consultation }
}

export async function readConsultation(repo: P2PostgresRepository, context: SecurityContext, id: string): Promise<Outcome<Consultation>> {
  const actorId = requireActor(context)
  const tenantId = authoritativeTenantId(context)
  const consultation = await repo.getConsultation(tenantId, actorId, id).catch((error) => { if (error instanceof Error && error.message === 'NotFound') return undefined; throw error })
  if (!consultation || !canReadConsultation(context, consultation)) return { ok: false, error: 'NOT_FOUND_OR_NOT_AUTHORIZED' }
  return { ok: true, value: consultation }
}

/** P3-A: SecurityContext → request-ownership validation → consultation lookup → authorization
 * → result. Fails closed at every step; never accepts a caller-supplied tenant or role. The
 * request is fetched first (tenant-scoped, via the existing authoritative repo path) so
 * ownership can be checked against context.membershipId — never against anything the caller
 * supplied — before the consultation is even looked up. */
export async function readConsultationForRequest(repo: P2PostgresRepository, context: SecurityContext, requestId: string): Promise<Outcome<Consultation>> {
  const actorId = requireActor(context)
  const tenantId = authoritativeTenantId(context)
  const request = await repo.getRequest(tenantId, actorId, requestId).catch((error) => { if (error instanceof Error && error.message === 'NotFound') return undefined; throw error })
  if (!request) return { ok: false, error: 'NOT_FOUND_OR_NOT_AUTHORIZED' }
  const consultation = await repo.getConsultationByRequestId(tenantId, actorId, requestId).catch((error) => { if (error instanceof Error && error.message === 'NotFound') return undefined; throw error })
  if (!consultation) return { ok: false, error: 'NOT_FOUND_OR_NOT_AUTHORIZED' }
  const allowed = canReadConsultationAsRequestOwner(context, request, consultation) || canReadConsultation(context, consultation)
  if (!allowed) return { ok: false, error: 'NOT_FOUND_OR_NOT_AUTHORIZED' }
  return { ok: true, value: consultation }
}

/** P2-F, corrected per R01A: consultantMembershipId is a REQUESTED target only, never authority
 * evidence. Eligibility (exists, same tenant, ACTIVE, ROLE-04) is verified authoritatively inside
 * repo.assignConsultant() via the SECURITY DEFINER function, in the same transaction as the
 * UPDATE. This function-layer check is P2 policy (who may attempt an assignment); the repository
 * layer check is P1-authoritative membership eligibility (who may BE assigned). Both must pass. */
export async function assignConsultant(repo: P2PostgresRepository, context: SecurityContext, id: string, expectedVersion: number, consultantMembershipId: string): Promise<Outcome<Consultation>> {
  const actorId = requireActor(context)
  const tenantId = authoritativeTenantId(context)
  const current = await repo.getConsultation(tenantId, actorId, id).catch((error) => { if (error instanceof Error && error.message === 'NotFound') return undefined; throw error })
  if (!current) return { ok: false, error: 'NOT_FOUND_OR_NOT_AUTHORIZED' }
  if (!canAssignConsultant(context, current)) {
    await repo.appendDenialAudit(tenantId, actorId, { actorId, action: 'ASSIGN', resourceType: 'consultation', resourceId: id, outcome: 'DENY', reasonCode: 'ACTION_NOT_AUTHORIZED', correlationId: context.correlationId })
    return { ok: false, error: 'ACTION_NOT_AUTHORIZED' }
  }
  if (!/^[A-Za-z0-9_-]+$/.test(consultantMembershipId)) return { ok: false, error: 'ASSIGNEE_NOT_ELIGIBLE' }
  const updated = await repo.assignConsultant(tenantId, actorId, id, expectedVersion, consultantMembershipId, context.correlationId).catch((error) => {
    if (error instanceof Error && error.message === 'ConcurrencyFailure') return { kind: 'conflict' as const }
    if (error instanceof Error && error.message === 'ASSIGNEE_NOT_ELIGIBLE') return { kind: 'ineligible' as const }
    throw error
  })
  if (updated && 'kind' in updated) {
    // The DB transaction rolled back with no mutation; a same-shape DENY/CONFLICT audit is
    // recorded here in its own short transaction, matching the P2-R01A residual-audit pattern.
    await repo.appendDenialAudit(tenantId, actorId, { actorId, action: 'ASSIGN', resourceType: 'consultation', resourceId: id, outcome: updated.kind === 'conflict' ? 'CONFLICT' : 'DENY', reasonCode: updated.kind === 'conflict' ? 'VERSION_CONFLICT' : 'ASSIGNEE_NOT_ELIGIBLE', correlationId: context.correlationId })
    return { ok: false, error: updated.kind === 'conflict' ? 'VERSION_CONFLICT' : 'ASSIGNEE_NOT_ELIGIBLE' }
  }
  return { ok: true, value: updated as Consultation }
}

async function transitionConsultationGuarded(repo: P2PostgresRepository, context: SecurityContext, id: string, expectedVersion: number, target: ConsultationState): Promise<Outcome<Consultation>> {
  const actorId = requireActor(context)
  const tenantId = authoritativeTenantId(context)
  const current = await repo.getConsultation(tenantId, actorId, id).catch((error) => { if (error instanceof Error && error.message === 'NotFound') return undefined; throw error })
  if (!current) return { ok: false, error: 'NOT_FOUND_OR_NOT_AUTHORIZED' }
  if (!canAdvanceConsultation(context, current)) {
    await repo.appendDenialAudit(tenantId, actorId, { actorId, action: 'TRANSITION', resourceType: 'consultation', resourceId: id, outcome: 'DENY', reasonCode: 'ACTION_NOT_AUTHORIZED', correlationId: context.correlationId, previousState: current.state, requestedState: target })
    return { ok: false, error: 'ACTION_NOT_AUTHORIZED' }
  }
  if (!isConsultationTransitionAllowed(current.state, target)) return { ok: false, error: 'STATE_TRANSITION_NOT_ALLOWED' }
  const updated = await repo.transitionConsultation(tenantId, actorId, id, expectedVersion, target, context.correlationId, current.state).catch((error) => { if (error instanceof Error && error.message === 'ConcurrencyFailure') return undefined; throw error })
  if (!updated) return { ok: false, error: 'VERSION_CONFLICT' }
  return { ok: true, value: updated }
}

export const activateConsultation = (repo: P2PostgresRepository, context: SecurityContext, id: string, expectedVersion: number) => transitionConsultationGuarded(repo, context, id, expectedVersion, 'ACTIVE')
export const pauseConsultation = (repo: P2PostgresRepository, context: SecurityContext, id: string, expectedVersion: number) => transitionConsultationGuarded(repo, context, id, expectedVersion, 'PAUSED')
export const completeConsultation = (repo: P2PostgresRepository, context: SecurityContext, id: string, expectedVersion: number) => transitionConsultationGuarded(repo, context, id, expectedVersion, 'COMPLETED')
export const closeConsultation = (repo: P2PostgresRepository, context: SecurityContext, id: string, expectedVersion: number) => transitionConsultationGuarded(repo, context, id, expectedVersion, 'CLOSED')
