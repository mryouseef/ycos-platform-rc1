/**
 * P2 Core Consulting Workflow — domain types and pure lifecycle rules.
 * Vocabulary intentionally matches src/m06/domain.ts (RequestState/EngagementState
 * shape) per P2-ADR-001: same authoritative terminology, independent persistence.
 * No PostgreSQL, no SecurityContext, no side effects in this file.
 */

export type RequestState = 'DRAFT' | 'SUBMITTED' | 'REVIEW' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN' | 'CLOSED'
export type ConsultationState = 'PROPOSED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CLOSED'

export type ConsultingRequest = Readonly<{
  id: string
  tenantId: string
  ownerMembershipId: string
  title: string
  summary: string
  state: RequestState
  version: number
  classification: 'synthetic'
}>

export type Consultation = Readonly<{
  id: string
  tenantId: string
  requestId: string
  managerMembershipId: string
  consultantMembershipId: string | null
  state: ConsultationState
  version: number
}>

export type SafeError =
  | 'NOT_FOUND_OR_NOT_AUTHORIZED'
  | 'ACTION_NOT_AUTHORIZED'
  | 'STATE_TRANSITION_NOT_ALLOWED'
  | 'VERSION_CONFLICT'
  | 'VALIDATION_ERROR'
  | 'ALREADY_ESTABLISHED'
  | 'ASSIGNEE_NOT_ELIGIBLE'

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: SafeError }

/** Request transitions, mirroring the allowlist shape already proven in src/m06/service.ts. */
const REQUEST_TRANSITIONS: Readonly<Record<RequestState, readonly RequestState[]>> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['REVIEW', 'WITHDRAWN'],
  REVIEW: ['ACCEPTED', 'DECLINED', 'WITHDRAWN'],
  ACCEPTED: ['CLOSED'],
  DECLINED: ['CLOSED'],
  WITHDRAWN: [],
  CLOSED: [],
}

export function isRequestTransitionAllowed(from: RequestState, to: RequestState): boolean {
  return REQUEST_TRANSITIONS[from]?.includes(to) === true
}

const CONSULTATION_TRANSITIONS: Readonly<Record<ConsultationState, readonly ConsultationState[]>> = {
  PROPOSED: ['ACTIVE', 'CLOSED'],
  ACTIVE: ['PAUSED', 'COMPLETED', 'CLOSED'],
  PAUSED: ['ACTIVE', 'CLOSED'],
  COMPLETED: ['CLOSED'],
  CLOSED: [],
}

export function isConsultationTransitionAllowed(from: ConsultationState, to: ConsultationState): boolean {
  return CONSULTATION_TRANSITIONS[from]?.includes(to) === true
}

export function boundedTitle(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= 200
}

export function boundedSummary(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= 2000
}
