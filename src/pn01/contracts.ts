/** PN-01 provider-neutral canonical contracts: synthetic/local use only. */
export type DataClass = 'synthetic' | 'internal' | 'restricted';
export type Capability = 'privateConnectivity'|'customerManagedKeys'|'pointInTimeRecovery'|'regionalBackupControl'|'transactionalWrites'|'conditionalWrites'|'workloadIdentity'|'immutableAuditExport'|'vectorSearch'|'streaming';
export type CanonicalError = 'ValidationError'|'AuthenticationRequired'|'AccessDenied'|'ScopeViolation'|'NotFound'|'Conflict'|'ConcurrencyFailure'|'RateLimited'|'DependencyUnavailable'|'Timeout'|'UnsupportedCapability'|'DataClassificationViolation'|'PolicyViolation'|'IntegrityFailure'|'InternalFailure';
export interface SecurityContext { requestId:string; actorId:string; actorType:'synthetic-user'|'synthetic-service'|'synthetic-admin'; tenantId:string; roles:string[]; permissions:string[]; purpose:string; dataScope:DataClass; correlationId:string; traceId:string; delegated?:boolean; membershipId?:string; authorityVersion?:number; }
export interface AuthorizationDecision { subject:string; action:string; resource:string; tenantId:string; decision:'allow'|'deny'; reasonCode:string; policyVersion:string; timestamp:string; correlationId:string; }
export interface CapabilitySet { version:'1.0'; supported:ReadonlySet<Capability>; require(c:Capability):void; }
export const capabilitySet=(items:Capability[]=[]):CapabilitySet=>({version:'1.0',supported:new Set(items),require(c){if(!this.supported.has(c)) throw new Error(`UnsupportedCapability:${c}`)}});
export const requireScope=(c:SecurityContext)=>{if(!c.tenantId||!c.purpose)throw new Error('ScopeViolation:scope and purpose required')};
export const defaultDeny=(c:SecurityContext, action:string, resource:string):AuthorizationDecision=>({subject:c.actorId,action,resource,tenantId:c.tenantId,decision:'deny',reasonCode:'DEFAULT_DENY',policyVersion:'pn01-1',timestamp:new Date(0).toISOString(),correlationId:c.correlationId});
export interface ScopedRequest { context:SecurityContext; idempotencyKey?:string; timeoutMs?:number; classification:DataClass; }
export interface ComputeRuntime { execute<T>(request:ScopedRequest & { operation:string }):Promise<T>; }
export interface RelationalDatabase { transaction<T>(request:ScopedRequest, work:(scope:string)=>Promise<T>):Promise<T>; }
export interface ObjectStorage { put(request:ScopedRequest & { objectId:string; metadata:Record<string,string> }):Promise<void>; get(request:ScopedRequest & { objectId:string }):Promise<{objectId:string}>; temporaryAccess(request:ScopedRequest & { objectId:string; expiresAt:string }):Promise<{tokenRef:string}>; }
export interface KeyManagement { keyReference(request:ScopedRequest & { purpose:string }):Promise<{keyRef:string;version:string}>; }
export interface SecretManagement { secretReference(request:ScopedRequest & { purpose:string }):Promise<{secretRef:string;version:string}>; }
export interface IdentityProvider { validate(request:ScopedRequest & { credentialReference:string }):Promise<{subjectId:string;claims:Record<string,string>}>; }
export interface AuditSink { append(event:{eventId:string;eventType:string;actor:string;tenantId:string;action:string;resource:string;result:string;correlationId:string;classification:DataClass;schemaVersion:'1.0'}):Promise<void>; }
export interface ObservabilitySink { record(event:{kind:'log'|'metric'|'trace';correlationId:string;safeMessage:string}):Promise<void>; }
export interface BackgroundJobRuntime { enqueue(request:ScopedRequest & {jobId:string;jobType:string;payloadRef:string;maxAttempts:number}):Promise<void>; }
export interface NotificationProvider { prepare(request:ScopedRequest & {recipientRef:string;templateRef:string;locale:string}):Promise<{delivery:'not-sent'}>; }
export interface AIProvider { prepare(request:ScopedRequest & {modelCapability:string;humanOversight:true;inputRef:string}):Promise<{execution:'dormant'}>; }
export interface EmbeddingProvider { prepare(request:ScopedRequest & {inputRef:string;spaceVersion:string}):Promise<{execution:'dormant'}>; }
export interface RetrievalBackend { query(request:ScopedRequest & {query:string;limit:number}):Promise<{sourceIds:string[]}>; }
