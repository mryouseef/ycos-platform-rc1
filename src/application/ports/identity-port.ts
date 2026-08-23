/** M-04 identity contract: only a future server verifier may establish identity and membership authority. */
import type { CorrelationId, Membership, PortResult, VerifiedIdentity } from "./types";
import { activeMembership, denied } from "./types";
export interface IdentityPort {
  resolveVerifiedIdentity(input: Readonly<{ correlationId: CorrelationId; untrustedClientClaims?: unknown }>): Promise<PortResult<VerifiedIdentity>>;
  resolveMemberships(input: Readonly<{ correlationId: CorrelationId; identityId: string; untrustedClientClaims?: unknown }>): Promise<PortResult<readonly Membership[]>>;
}
export class DisabledIdentityPort implements IdentityPort {
  async resolveVerifiedIdentity({ correlationId }: Readonly<{ correlationId: CorrelationId; untrustedClientClaims?: unknown }>): Promise<PortResult<VerifiedIdentity>> { return denied("IDENTITY_UNAVAILABLE", correlationId); }
  async resolveMemberships({ correlationId }: Readonly<{ correlationId: CorrelationId; identityId: string; untrustedClientClaims?: unknown }>): Promise<PortResult<readonly Membership[]>> { return denied("MEMBERSHIP_NOT_VERIFIED", correlationId); }
}
