/** M-04 corrective closeout: provider-neutral authority types; browser claims never create authority. */
export type Classification = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
export type CorrelationId = string & { readonly __brand: "CorrelationId" };
export type PortErrorCode = "UNAUTHENTICATED" | "IDENTITY_UNAVAILABLE" | "IDENTITY_DISABLED" | "MEMBERSHIP_NOT_VERIFIED" | "RESOURCE_NOT_AVAILABLE" | "STORAGE_DISABLED" | "RECIPIENT_OUT_OF_SCOPE" | "RECIPIENT_INACTIVE" | "PROVIDER_DISABLED" | "AI_DISABLED" | "INVALID_INPUT" | "INVALID_METADATA" | "UNSAFE_STORAGE_KEY" | "UNSAFE_NOTIFICATION_PAYLOAD" | "INVALID_IDEMPOTENCY_KEY";
export type PortError = Readonly<{ code: PortErrorCode; correlationId: CorrelationId; safeMessage: string }>;
export type PortResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: PortError }>;
export type TenantScope = Readonly<{ tenantId: string; clientOrganizationId: string }>;
export type Membership = Readonly<{ membershipId: string; identityId: string; scope: TenantScope; roleIds: readonly string[]; status: "ACTIVE" | "SUSPENDED" | "REVOKED" }>;
export type VerifiedIdentity = Readonly<{ identityId: string; status: "VERIFIED" | "DISABLED"; memberships: readonly Membership[] }>;
export type AuthorizationDecision = Readonly<{ allowed: boolean; tenantScope: TenantScope; reason: "SERVER_DERIVED" | "DENIED" }>;
export type RequestContext = Readonly<{ correlationId: CorrelationId; authorization: AuthorizationDecision }>;
export const denied = <T>(code: PortErrorCode, correlationId: CorrelationId): PortResult<T> => ({ ok: false, error: { code, correlationId, safeMessage: "Request cannot be processed." } });
export const sameScope = (left: TenantScope, right: TenantScope) => left.tenantId === right.tenantId && left.clientOrganizationId === right.clientOrganizationId;
export const activeMembership = (membership: Membership) => membership.status === "ACTIVE";
export const verifiedActiveMemberships = (identity: VerifiedIdentity): readonly Membership[] => identity.status === "VERIFIED" ? identity.memberships.filter(activeMembership) : [];
