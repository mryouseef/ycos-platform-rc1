import { ApplicationCore, MemoryWorkRepository, type WorkItemRepository } from '../pn02/core'
import type { SecurityContext } from '../pn01/contracts'

export type LocalPrincipal = 'SYNTHETIC_A' | 'SYNTHETIC_B' | 'SYNTHETIC_DENY'
export type ApiResponse = { status: number; body: Record<string, unknown> }
const context=(actorId:string,tenantId:string,permissions:string[]):SecurityContext=>({requestId:`server-${actorId}`,actorId,actorType:'synthetic-user',tenantId,roles:permissions.length?['work-item-actor']:[],permissions,purpose:'work-item',dataScope:'synthetic',correlationId:`server-${actorId}`,traceId:`trace-${actorId}`})
const contexts: Record<LocalPrincipal, SecurityContext> = {
  SYNTHETIC_A: context('SYNTHETIC_A','SYNTHETIC_A',['work-item']),
  SYNTHETIC_B: context('SYNTHETIC_B','SYNTHETIC_B',['work-item']),
  SYNTHETIC_DENY: context('SYNTHETIC_DENY','SYNTHETIC_A',[]),
}
export class LocalApplicationService {
  readonly repo: WorkItemRepository; readonly core: ApplicationCore; readonly events: Record<string, unknown>[] = []
  constructor(repository:WorkItemRepository=new MemoryWorkRepository()){this.repo=repository;this.core=new ApplicationCore(this.repo)}
  async seed(){ await this.repo.save({id:'W-A',tenantId:'SYNTHETIC_A',state:'draft',version:1,classification:'synthetic'}); await this.repo.save({id:'W-B',tenantId:'SYNTHETIC_B',state:'draft',version:1,classification:'synthetic'}) }
  private ctx(p: unknown){ if(typeof p !== 'string' || !(p in contexts)) throw new Error('Unauthenticated'); const c=contexts[p as LocalPrincipal]; if(!c.permissions.includes('work-item')) throw new Error('Denied'); return c }
  private error(e: unknown): ApiResponse { const code = e instanceof Error ? e.message : 'IntegrityFailure'; const status = code==='NotFound'?404:code==='Conflict'?409:code==='Unauthenticated'?401:403; return {status,body:{error:{code: code==='Conflict'?'Conflict':code==='NotFound'?'NotFound':'Denied'}}} }
  async read(principal: unknown, tenantId: unknown, id: unknown): Promise<ApiResponse>{ try { if(typeof tenantId!=='string'||typeof id!=='string') throw new Error('Denied'); const item=await this.core.read(this.ctx(principal),tenantId,id); this.events.push({kind:'audit',action:'read',tenantId}); return {status:200,body:{item}} } catch(e){return this.error(e)} }
  async submit(principal: unknown, body: unknown): Promise<ApiResponse>{ try { if(!body||typeof body!=='object') throw new Error('Denied'); const b=body as Record<string,unknown>; if(typeof b.tenantId!=='string'||typeof b.workItemId!=='string'||typeof b.idempotencyKey!=='string'||typeof b.expectedVersion!=='number'||b.purpose!=='work-item') throw new Error('Denied'); const context=this.ctx(principal); const r=await this.core.submit({id:`server-${b.idempotencyKey}`,context,tenantId:b.tenantId,purpose:b.purpose,idempotencyKey:b.idempotencyKey,workItemId:b.workItemId,expectedVersion:b.expectedVersion}); this.events.push({kind:'audit',action:'submit',tenantId:b.tenantId,duplicate:r.duplicate}); return {status:200,body:r} }catch(e){return this.error(e)} }
  health():ApiResponse{return {status:200,body:{status:'ok',synthetic:true}}}
  readiness():ApiResponse{return {status:200,body:{status:'ready',synthetic:true}}}
}
