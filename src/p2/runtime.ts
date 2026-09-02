/** P2 configuration remains server-only and fails closed — mirrors src/p1/authorization/provider-backed-runtime.ts. */
import { P2PostgresRepository } from './repository'

const databaseUrl = (): string => {
  const value = process.env.ILE01_MANAGED_DATABASE_URL
  if (!value || value.trim().length === 0) throw new Error('DependencyUnavailable')
  return value
}

export const createP2Repository = () => new P2PostgresRepository(databaseUrl())
