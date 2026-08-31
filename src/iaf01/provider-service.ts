/** P1-D2C/D/E security contract: provider-backed requests use only a server-derived SecurityContext. */
import { ApplicationCore } from '../pn02/core'
import type { SecurityContext } from '../pn01/contracts'
import type { IleManagedPostgresWorkItemRepository } from '../ile01/managed-postgres'

export class ProviderBackedWorkItemService {
  constructor(private readonly repository: IleManagedPostgresWorkItemRepository) {}
  async read(context: SecurityContext, workItemId: string) {
    const core = new ApplicationCore({
      get: (_tenantId, id) => this.repository.getWithSecurityContext(context, id),
      save: async () => { throw new Error('IntegrityFailure') },
    })
    return core.read(context, context.tenantId, workItemId)
  }
}
