import type { Actor, Scope } from "@/src/portal/policy";
import type { ConsultationRequest, Engagement, Project, ProjectMembership, WorkItem } from "./domain";

const a = { tenantId: "synthetic-tenant-a", clientId: "synthetic-client-a" } as const;
const b = { tenantId: "synthetic-tenant-b", clientId: "synthetic-client-b" } as const;
const meta = { createdAt: "2026-08-20T00:00:00Z", updatedAt: "2026-08-20T00:00:00Z" };
type Store = { requests: ConsultationRequest[]; engagements: Engagement[]; projects: Project[]; memberships: ProjectMembership[]; work: WorkItem[] };
const seed = (): Store => ({
  requests: (["DRAFT", "SUBMITTED", "REVIEW", "ACCEPTED", "DECLINED"].map((state, i) => ({ id: i === 0 ? "req-a-01" : `req-a-${state.toLowerCase()}`, scope: a, ownerMembershipId: "membership-synthetic-role-02-a", title: `Synthetic request ${state}`, summary: "Synthetic scoped request.", classification: "CONFIDENTIAL", state: state as ConsultationRequest["state"], version: 1, meta: { ...meta } })) as ConsultationRequest[]).concat([{ id: "req-b-01", scope: b, ownerMembershipId: "membership-synthetic-role-02-b", title: "Synthetic client B request", summary: "Synthetic scoped request.", classification: "CONFIDENTIAL", state: "SUBMITTED", version: 1, meta: { ...meta } }]),
  engagements: (["PROPOSED", "ACTIVE", "PAUSED"].map(state => ({ id: `eng-a-${state.toLowerCase()}`, requestId: "req-a-01", scope: a, managerMembershipId: "membership-synthetic-role-05-a", state: state as Engagement["state"], version: 1 })) as Engagement[]).concat([{ id: "eng-b-01", requestId: "req-b-01", scope: b, managerMembershipId: "membership-synthetic-role-05-b", state: "ACTIVE", version: 1 }]),
  projects: (["PROPOSED", "ACTIVE", "PAUSED", "COMPLETED"].map(state => ({ id: state === "ACTIVE" ? "prj-a-01" : `prj-a-${state.toLowerCase()}`, engagementId: "eng-a-active", scope: a, managerMembershipId: "membership-synthetic-role-05-a", name: `Synthetic project ${state}`, state: state as Project["state"], classification: "CONFIDENTIAL", version: 1 })) as Project[]).concat([{ id: "prj-b-01", engagementId: "eng-b-01", scope: b, managerMembershipId: "membership-synthetic-role-05-b", name: "Synthetic client B project", state: "ACTIVE", classification: "CONFIDENTIAL", version: 1 }]),
  memberships: (["membership-synthetic-role-02-a", "membership-synthetic-role-04-a", "membership-synthetic-role-05-a"].map((actorMembershipId, i) => ({ id: `pm-a-${i}`, projectId: "prj-a-01", actorMembershipId, role: (["CLIENT", "CONSULTANT", "MANAGER"] as const)[i], state: "ACTIVE" as const })) as ProjectMembership[]).concat([{ id: "pm-a-inactive", projectId: "prj-a-01", actorMembershipId: "membership-synthetic-inactive-a", role: "CONSULTANT", state: "INACTIVE" }]),
  work: ["OPEN", "IN_PROGRESS", "BLOCKED", "IN_REVIEW"].map(state => ({ id: state === "OPEN" ? "wi-a-01" : `wi-a-${state.toLowerCase()}`, projectId: "prj-a-01", scope: a, assigneeMembershipId: "membership-synthetic-role-04-a", title: `Synthetic work ${state}`, description: "Synthetic work item.", state: state as WorkItem["state"], priority: "MEDIUM", version: 1, meta: { ...meta } }))
});
type M06Global = typeof globalThis & { __ycosM06Store?: Store };
const runtime = globalThis as M06Global;
const store = () => runtime.__ycosM06Store ??= seed();
const same = (x: Scope, y: Scope) => x.tenantId === y.tenantId && x.clientId === y.clientId;
const active = (projectId: string, membershipId: string) => store().memberships.some(m => m.projectId === projectId && m.actorMembershipId === membershipId && m.state === "ACTIVE");
export const resetM06Repository = () => { runtime.__ycosM06Store = seed(); };
export const m06repo = {
  requestsFor: (actor: Actor) => store().requests.filter(x => same(x.scope, actor.scope) && (actor.role === "ROLE-05" || actor.role === "ROLE-03" || x.ownerMembershipId === actor.membershipId)),
  requestFor: (actor: Actor, id: string) => m06repo.requestsFor(actor).find(x => x.id === id),
  engagementsFor: (actor: Actor) => store().engagements.filter(x => same(x.scope, actor.scope) && (actor.role === "ROLE-05" || active("prj-a-01", actor.membershipId))),
  engagementFor: (actor: Actor, id: string) => m06repo.engagementsFor(actor).find(x => x.id === id),
  projectsFor: (actor: Actor) => store().projects.filter(x => same(x.scope, actor.scope) && (actor.role === "ROLE-05" || active(x.id, actor.membershipId))),
  projectFor: (actor: Actor, id: string) => m06repo.projectsFor(actor).find(x => x.id === id),
  projectForRecordsArchive: (actor: Actor, id: string) => actor.role === "ROLE-07" && actor.recordsAuthority === true ? store().projects.find(x => x.id === id && same(x.scope, actor.scope) && x.state === "COMPLETED") : undefined,
  completedProjectsForRecords: (actor: Actor) => actor.role === "ROLE-07" && actor.recordsAuthority === true ? store().projects.filter(x => same(x.scope, actor.scope) && ["COMPLETED", "ARCHIVED"].includes(x.state)) : [],
  workFor: (actor: Actor, projectId: string) => store().work.filter(x => x.projectId === projectId && same(x.scope, actor.scope) && active(projectId, actor.membershipId) && (actor.role === "ROLE-05" || x.assigneeMembershipId === actor.membershipId)),
  workItemFor: (actor: Actor, id: string) => store().work.find(x => x.id === id && same(x.scope, actor.scope) && active(x.projectId, actor.membershipId) && (actor.role === "ROLE-05" || x.assigneeMembershipId === actor.membershipId)),
  activeMembership: active,
  countProjectsFor: (actor: Actor) => m06repo.projectsFor(actor).length,
  updateRequest: (x: ConsultationRequest) => { store().requests = store().requests.map(y => y.id === x.id ? x : y); return x; },
  updateEngagement: (x: Engagement) => { store().engagements = store().engagements.map(y => y.id === x.id ? x : y); return x; },
  updateProject: (x: Project) => { store().projects = store().projects.map(y => y.id === x.id ? x : y); return x; },
  updateWork: (x: WorkItem) => { store().work = store().work.map(y => y.id === x.id ? x : y); return x; }
  ,createWork: (x: WorkItem) => { store().work = [...store().work, x]; return x; }
};
