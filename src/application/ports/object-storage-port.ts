/** M-04 storage contract: typed tenant scope and metadata validation; no file, locator, URL, or network is ever produced. */
import type { AuthorizationDecision, Classification, CorrelationId, PortResult, TenantScope } from "./types";
import { denied, sameScope } from "./types";
export type StorageMetadata = Readonly<{ resourceId: string; storageScope: TenantScope; abstractStorageKey: string; classification: Classification; fileState: "REGISTERED" | "ARCHIVED"; mediaType: "application/pdf" | "image/png" | "image/jpeg"; byteSize: number }>;
const acceptedMediaTypes = new Set<StorageMetadata["mediaType"]>(["application/pdf", "image/png", "image/jpeg"]);
const safeKey = (value: string) => /^[a-z0-9][a-z0-9/_-]{2,127}$/.test(value) && !value.includes("..") && !value.includes("//") && !value.includes(":");
export const validateStorageMetadata = (metadata: StorageMetadata): "VALID" | "UNSAFE_KEY" | "INVALID" => { if (!safeKey(metadata.abstractStorageKey)) return "UNSAFE_KEY"; if (!metadata.resourceId || !metadata.storageScope.tenantId || !metadata.storageScope.clientOrganizationId || !acceptedMediaTypes.has(metadata.mediaType) || !Number.isInteger(metadata.byteSize) || metadata.byteSize < 1 || metadata.byteSize > 10 * 1024 * 1024) return "INVALID"; return "VALID"; };
export interface ObjectStoragePort {
  registerMetadata(input: Readonly<{ correlationId: CorrelationId; authorization: AuthorizationDecision; metadata: StorageMetadata }>): Promise<PortResult<{ metadataId: string }>>;
  requestAuthorizedLocator(input: Readonly<{ correlationId: CorrelationId; authorization: AuthorizationDecision; resourceId: string; resourceScope: TenantScope; classification: Classification }>): Promise<PortResult<{ abstractLocator: string; expiresConceptually: true }>>;
}
export class DisabledObjectStoragePort implements ObjectStoragePort {
  async registerMetadata({ correlationId, authorization, metadata }: Readonly<{ correlationId: CorrelationId; authorization: AuthorizationDecision; metadata: StorageMetadata }>): Promise<PortResult<{ metadataId: string }>> { if (!authorization.allowed || !sameScope(authorization.tenantScope, metadata.storageScope)) return denied("RESOURCE_NOT_AVAILABLE", correlationId); const validation = validateStorageMetadata(metadata); if (validation === "UNSAFE_KEY") return denied("UNSAFE_STORAGE_KEY", correlationId); if (validation === "INVALID") return denied("INVALID_METADATA", correlationId); return denied("STORAGE_DISABLED", correlationId); }
  async requestAuthorizedLocator({ correlationId, authorization, resourceScope }: Readonly<{ correlationId: CorrelationId; authorization: AuthorizationDecision; resourceId: string; resourceScope: TenantScope; classification: Classification }>): Promise<PortResult<{ abstractLocator: string; expiresConceptually: true }>> { return authorization.allowed && sameScope(authorization.tenantScope, resourceScope) ? denied("STORAGE_DISABLED", correlationId) : denied("RESOURCE_NOT_AVAILABLE", correlationId); }
}
