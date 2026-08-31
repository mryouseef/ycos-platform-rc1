/**
 * P1-D2C/D/E security contract: a verified provider subject is mapped to internal authority on the server.
 * Provider claims and browser input never set the tenant, membership, role, or database context.
 */
import { validateIdentity, type IdentityValidationPolicy, type SupabaseAuthPort } from '../auth/supabase-auth-adapter'
import { P1_ROLE_CODES, type P1Membership, type P1Organization, type P1InternalUser, resolveVerifiedMembership } from '../auth/identity-resolution'
import { deriveAuthenticatedOrganizationContext } from './organization-context'
import type { ProviderMembershipRecord } from '../../ile01/managed-postgres'

export type ProviderMembershipStore = Readonly<{ providerMembership: (issuer: string, subject: string) => Promise<ProviderMembershipRecord | undefined> }>

const supportedRole = (value: string): value is typeof P1_ROLE_CODES[number] => (P1_ROLE_CODES as readonly string[]).includes(value)

export async function deriveProviderBackedSecurityContext(input: Readonly<{ auth: SupabaseAuthPort; policy: IdentityValidationPolicy; store: ProviderMembershipStore; requestId: string }>) {
  const identity = await validateIdentity(input.auth, input.policy)
  const record = await input.store.providerMembership(identity.providerIssuer, identity.providerSubject)
  if (!record || record.user.status !== 'ACTIVE') throw new Error('AccessDenied')
  if (record.memberships.some((membership) => membership.status === 'ACTIVE' && !supportedRole(membership.roleCode))) throw new Error('AccessDenied')
  const users = new Map<string, P1InternalUser>([[record.user.id, record.user]])
  const organizations = new Map<string, P1Organization>(Object.values(record.organizations).map((organization) => [organization.id, organization]))
  const memberships = record.memberships.filter((membership): membership is P1Membership => supportedRole(membership.roleCode))
  const resolved = resolveVerifiedMembership({
    findUser: (issuer, subject) => Array.from(users.values()).find((user) => user.providerIssuer === issuer && user.providerSubject === subject),
    membershipsForUser: (userId) => memberships.filter((membership) => membership.userId === userId),
    findOrganization: (organizationId) => organizations.get(organizationId),
  }, { providerIssuer: identity.providerIssuer, providerSubject: identity.providerSubject })
  return deriveAuthenticatedOrganizationContext(resolved, input.requestId)
}
