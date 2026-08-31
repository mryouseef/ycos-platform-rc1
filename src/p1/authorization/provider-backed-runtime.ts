/** P1-D2C/D/E security contract: configuration and persistence remain server-only and fail closed. */
import { IleManagedPostgresWorkItemRepository } from '../../ile01/managed-postgres'

const databaseUrl = (): string => {
  const value = process.env.ILE01_MANAGED_DATABASE_URL
  if (!value || value.trim().length === 0) throw new Error('DependencyUnavailable')
  return value
}

export const createProviderBackedRepository = () => new IleManagedPostgresWorkItemRepository(databaseUrl())
