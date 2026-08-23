/** PXSI-01 local-only runtime: browser selection maps to a fixed synthetic principal; no client tenant or permission claim is trusted. */
import { LocalApplicationService, type LocalPrincipal } from './service'
import { PostgresWorkItemRepository } from '../pn03/postgres-adapter'
import { IleManagedPostgresWorkItemRepository } from '../ile01/managed-postgres'
type Runtime=typeof globalThis & {__ycosIafRuntime?:LocalApplicationService;__ycosIafSeeded?:boolean}
const state=globalThis as Runtime
const ileDataBoundary=()=>{if(process.env.REAL_DATA_ENABLED==='true'||process.env.RESTRICTED_DATA_ENABLED==='true'||process.env.EXTERNAL_AI_ENABLED==='true')throw new Error('IntegrityFailure')}
export async function localService(){const pg=process.env.IAF01_PG_SOCKET&&process.env.IAF01_PG_PORT;const managed=process.env.ILE01_MANAGED_DATABASE_URL;if(managed)ileDataBoundary();if(!state.__ycosIafRuntime){const repo=managed?new IleManagedPostgresWorkItemRepository(managed,process.env.ILE01_MANAGED_PG_ALLOW_INSECURE_TEST==='true'):pg?new PostgresWorkItemRepository(process.env.IAF01_PG_SOCKET!,process.env.IAF01_PG_PORT!):undefined;state.__ycosIafRuntime=new LocalApplicationService(repo)}if(!pg&&!managed&&!state.__ycosIafSeeded){await state.__ycosIafRuntime.seed();state.__ycosIafSeeded=true}return state.__ycosIafRuntime}
export function principal(value:string|null):LocalPrincipal {return value==='SYNTHETIC_B'||value==='SYNTHETIC_DENY'?value:'SYNTHETIC_A'}
export function workItemFor(p:LocalPrincipal){return p==='SYNTHETIC_B'?'W-B':'W-A'}
