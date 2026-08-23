/** PN-03V2 local/test PostgreSQL adapter; domain/application do not import this module. */
import { execFileSync } from 'node:child_process';
import type { WorkItem } from '../pn02/core';
export class PostgresWorkItemRepository {
  constructor(private socket:string,private port:string){}
  private sql(query:string,args:string[]=[]){try{return execFileSync('psql',['-X','-q','-w','-U','postgres','-h',this.socket,'-p',this.port,'-d','postgres','-v','ON_ERROR_STOP=1',...args.flatMap((v,i)=>['-v',`v${i}=${v}`]),'-tA'],{encoding:'utf8',input:query,timeout:5000,env:{...process.env,PGCONNECT_TIMEOUT:'3'}}).trim()}catch{throw new Error('IntegrityFailure') }}
  get(tenantId:string,id:string):WorkItem {const r=this.sql("SELECT id||'|'||tenant_id||'|'||state||'|'||version||'|'||classification FROM work_items WHERE tenant_id=:'v0' AND id=:'v1'",[tenantId,id]); if(!r)throw new Error('NotFound');const [i,t,s,v,c]=r.split('|');return {id:i,tenantId:t,state:s as WorkItem['state'],version:+v,classification:c as 'synthetic'} }
  save(item:WorkItem,expected?:number){if(typeof expected!=='number')throw new Error('IntegrityFailure');const r=this.sql("UPDATE work_items SET state=:'v0',version=:'v1' WHERE tenant_id=:'v2' AND id=:'v3' AND version=:'v4' RETURNING version",[item.state,String(item.version),item.tenantId,item.id,String(expected)]);if(!r)throw new Error('ConcurrencyFailure')}
}
