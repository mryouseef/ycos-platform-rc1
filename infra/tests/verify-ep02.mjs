import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', 'bicep', 'network');
const main = readFileSync(resolve(root, 'main.bicep'), 'utf8');
const nsg = readFileSync(resolve(root, 'modules/application-nsg.bicep'), 'utf8');
const network = readFileSync(resolve(root, 'modules/controlled-network.bicep'), 'utf8');
const params = readFileSync(resolve(root, 'params/controlled.bicepparam'), 'utf8');

const checks = [
  ['resource group scope', /targetScope = 'resourceGroup'/],
  ['controlled-only environment', /'controlled'/],
  ['parameterized controlled region', /authorizedControlledEvaluationRegion string/],
  ['planning CIDR parameter', /param addressSpace string/],
  ['application subnet parameter', /param applicationSubnetPrefix string/],
  ['private endpoint subnet parameter', /param privateEndpointSubnetPrefix string/],
  ['network module', /controlled-network\.bicep/],
  ['NSG module', /application-nsg\.bicep/],
  ['private endpoint policies disabled only in PE subnet', /name: 'private-endpoints'[\s\S]*privateEndpointNetworkPolicies: 'Disabled'/],
  ['application NSG attached', /networkSecurityGroup:/],
  ['public data-plane tag denied', /publicDataPlaneDefault: 'denied'/],
  ['no hard-coded Saudi value', !/saudi arabia east/i.test(`${main}${nsg}${network}${params}`)],
];

let failures = 0;
for (const [name, result] of checks) {
  if (result) console.log(`PASS: ${name}`);
  else {
    failures += 1;
    console.error(`FAIL: ${name}`);
  }
}
if (failures) process.exit(1);
console.log(`EP-02 source guard checks passed: ${checks.length}`);
