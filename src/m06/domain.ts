import type { Scope } from "@/src/portal/policy";

export type RequestState = "DRAFT" | "SUBMITTED" | "REVIEW" | "ACCEPTED" | "DECLINED" | "WITHDRAWN" | "CLOSED";
export type EngagementState = "PROPOSED" | "ACTIVE" | "PAUSED" | "CLOSED";
export type ProjectState = "PROPOSED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
export type WorkItemState = "OPEN" | "IN_PROGRESS" | "BLOCKED" | "IN_REVIEW" | "DONE" | "CANCELLED";
export type Meta = { createdAt: string; updatedAt: string };
export type ConsultationRequest = { id: string; scope: Required<Scope>; ownerMembershipId: string; title: string; summary: string; classification: "CONFIDENTIAL"; state: RequestState; version: number; meta: Meta };
export type Engagement = { id: string; requestId: string; scope: Required<Scope>; managerMembershipId: string; state: EngagementState; version: number };
export type Project = { id: string; engagementId: string; scope: Required<Scope>; managerMembershipId: string; name: string; state: ProjectState; classification: "CONFIDENTIAL"; version: number };
export type ProjectMembership = { id: string; projectId: string; actorMembershipId: string; role: "CLIENT" | "CONSULTANT" | "MANAGER"; state: "ACTIVE" | "INACTIVE" };
export type WorkItem = { id: string; projectId: string; scope: Required<Scope>; assigneeMembershipId: string; title: string; description: string; state: WorkItemState; priority: "LOW" | "MEDIUM" | "HIGH"; version: number; meta: Meta };
export type SafeError = "NOT_AVAILABLE" | "NOT_FOUND_OR_NOT_AUTHORIZED" | "ACTION_NOT_AUTHORIZED" | "STATE_TRANSITION_NOT_ALLOWED" | "VERSION_CONFLICT" | "MEMBERSHIP_REQUIRED" | "ASSIGNEE_NOT_ELIGIBLE";
type AuditBase = { event: "M06_AUTHORIZATION"; timestamp: string; correlationId: string; actorId: string; role: string; action: string; resourceType: string; resourceId: string; clientId?: string; projectId?: string; previousState?: string; requestedState?: string; versionBefore?: number; versionAfter?: number }; export type AuditIntent = (AuditBase & { outcome: "ALLOW"; reason?: never }) | (AuditBase & { outcome: "DENY"; reason: SafeError }) | (AuditBase & { outcome: "CONFLICT"; reason: "VERSION_CONFLICT" });
export type Result<T> = { ok: true; value: T; audit: AuditIntent } | { ok: false; error: SafeError; audit: AuditIntent };
