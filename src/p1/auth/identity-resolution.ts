/**
 * P1-D1 security contract: synthetic server-side identity resolution only.
 * No provider SDK, JWT validation, secrets, real identities, or browser authority.
 */
export const P1_SYNTHETIC_ISSUER = 'https://issuer.invalid/ycos-p1-d1'
export const P1_ROLE_CODES = ['ROLE-02', 'ROLE-03', 'ROLE-04', 'ROLE-05', 'ROLE-06', 'ROLE-07', 'ROLE-08'] as const
export type P1RoleCode = typeof P1_ROLE_CODES[number]
export type P1UserStatus = 'ACTIVE' | 'DISABLED'
export type P1MembershipStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED'
export type SyntheticIdentityInput = Readonly<{ providerIssuer: string; providerSubject: string; organizationHint?: string }>
export type P1InternalUser = Readonly<{ id: string; providerIssuer: string; providerSubject: string; status: P1UserStatus }>
export type P1Organization = Readonly<{ id: string; status: 'ACTIVE' | 'SUSPENDED' }>
export type P1Membership = Readonly<{ id: string; userId: string; organizationId: string; roleCode: P1RoleCode; status: P1MembershipStatus; authorityVersion: number }>
export type SyntheticIdentityStore = Readonly<{
  findUser: (issuer: string, subject: string) => P1InternalUser | undefined
  membershipsForUser: (userId: string) => readonly P1Membership[]
  findOrganization: (organizationId: string) => P1Organization | undefined
}>
export type ResolvedSyntheticMembership = Readonly<{ user: P1InternalUser; membership: P1Membership; organization: P1Organization }>
export type VerifiedIdentityInput = Readonly<{ providerIssuer: string; providerSubject: string; organizationHint?: string }>

const deny = (code: 'AuthenticationRequired' | 'AccessDenied' | 'ScopeViolation'): never => { throw new Error(code) }
const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

export function resolveVerifiedMembership(store: SyntheticIdentityStore, input: VerifiedIdentityInput): ResolvedSyntheticMembership {
  if (!nonEmpty(input.providerIssuer) || !nonEmpty(input.providerSubject)) deny('AuthenticationRequired')
  const user = store.findUser(input.providerIssuer, input.providerSubject)
  if (!user) throw new Error('AccessDenied')
  if (user.status !== 'ACTIVE') deny('AccessDenied')
  const active = store.membershipsForUser(user.id).filter((membership) => membership.status === 'ACTIVE')
  const candidates = nonEmpty(input.organizationHint) ? active.filter((membership) => membership.organizationId === input.organizationHint) : active
  if (candidates.length !== 1) deny('AccessDenied')
  const membership = candidates[0]
  const organization = store.findOrganization(membership.organizationId)
  if (!organization) throw new Error('ScopeViolation')
  if (organization.status !== 'ACTIVE' || membership.authorityVersion < 1) deny('ScopeViolation')
  return { user, membership, organization }
}

export function resolveSyntheticMembership(store: SyntheticIdentityStore, input: SyntheticIdentityInput): ResolvedSyntheticMembership {
  if (input.providerIssuer !== P1_SYNTHETIC_ISSUER || !input.providerSubject.startsWith('sub_syn_')) deny('AuthenticationRequired')
  return resolveVerifiedMembership(store, input)
}
