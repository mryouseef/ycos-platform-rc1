import { strict as assert } from 'node:assert'
import { LocalApplicationService } from '../src/iaf01/service'
const s=new LocalApplicationService(); await s.seed()
assert.equal((await s.read('SYNTHETIC_A','SYNTHETIC_A','W-A')).status,200)
assert.equal((await s.read('SYNTHETIC_A','SYNTHETIC_B','W-B')).status,403)
assert.equal((await s.read('SYNTHETIC_DENY','SYNTHETIC_A','W-A')).status,403)
assert.equal((await s.submit('SYNTHETIC_A',{tenantId:'SYNTHETIC_A',purpose:'work-item',workItemId:'W-A',expectedVersion:1,idempotencyKey:'K'})).status,200)
assert.equal((await s.submit('SYNTHETIC_A',{tenantId:'SYNTHETIC_A',purpose:'work-item',workItemId:'W-A',expectedVersion:1,idempotencyKey:'K2'})).status,409)
assert.equal(s.health().status,200); assert.equal(s.readiness().status,200)
assert.equal(s.events.length,2)
console.log('IAF01_E2E=8/8')
