import { strict as assert } from 'node:assert'
import { LocalApplicationService } from '../src/iaf01/service'
import { PostgresWorkItemRepository } from '../src/pn03/postgres-adapter'
const socket=process.env.IAF01_PG_SOCKET; const port=process.env.IAF01_PG_PORT
if(!socket||!port) throw new Error('IAF01 PostgreSQL harness context required')
const s=new LocalApplicationService(new PostgresWorkItemRepository(socket,port))
assert.equal((await s.read('SYNTHETIC_A','SYNTHETIC_A','W-A')).status,200)
assert.equal((await s.read('SYNTHETIC_A','SYNTHETIC_B','W-B')).status,403)
assert.equal((await s.read('UNRECOGNIZED','SYNTHETIC_A','W-A')).status,401)
assert.equal((await s.submit('SYNTHETIC_A',{tenantId:'SYNTHETIC_B',purpose:'work-item',workItemId:'W-B',expectedVersion:1,idempotencyKey:'PG-SPOOF'})).status,403)
assert.equal((await s.submit('SYNTHETIC_A',{tenantId:'SYNTHETIC_A',purpose:'wrong-purpose',workItemId:'W-A',expectedVersion:1,idempotencyKey:'PG-BAD'})).status,403)
assert.equal((await s.submit('SYNTHETIC_A',{tenantId:'SYNTHETIC_A',purpose:'work-item',workItemId:'W-A',expectedVersion:1,idempotencyKey:'PG-K'})).status,200)
assert.equal((await s.submit('SYNTHETIC_A',{tenantId:'SYNTHETIC_A',purpose:'work-item',workItemId:'W-A',expectedVersion:1,idempotencyKey:'PG-K'})).status,200)
assert.equal((await s.submit('SYNTHETIC_A',{tenantId:'SYNTHETIC_A',purpose:'work-item',workItemId:'W-A',expectedVersion:1,idempotencyKey:'PG-K2'})).status,409)
assert.equal(s.health().status,200); assert.equal(s.readiness().status,200)
console.log('IAF01_POSTGRES_E2E=10/10')
