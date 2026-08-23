/** M-04 local-only test double; never a provider, session, or runtime identity implementation. */
import type { IdentityPort } from "../ports/identity-port";
import { activeMembership, denied, verifiedActiveMemberships, type CorrelationId, type Membership, type PortResult, type VerifiedIdentity } from "../ports/types";
export class InMemoryIdentityTestDouble implements IdentityPort {
  constructor(private readonly identity: VerifiedIdentity | null) {}
  async resolveVerifiedIdentity(input: Readonly<{ correlationId: CorrelationId; untrustedClientClaims?: unknown }>): Promise<PortResult<VerifiedIdentity>> { if (!this.identity) return denied("UNAUTHENTICATED", input.correlationId); if (this.identity.status === "DISABLED") return denied("IDENTITY_DISABLED", input.correlationId); return { ok: true, value: { ...this.identity, memberships: verifiedActiveMemberships(this.identity) } }; }
  async resolveMemberships(input: Readonly<{ correlationId: CorrelationId; identityId: string; untrustedClientClaims?: unknown }>): Promise<PortResult<readonly Membership[]>> { if (!this.identity || this.identity.status !== "VERIFIED" || this.identity.identityId !== input.identityId) return denied("MEMBERSHIP_NOT_VERIFIED", input.correlationId); return { ok: true, value: this.identity.memberships.filter(member => member.identityId === input.identityId && activeMembership(member)) }; }
}
