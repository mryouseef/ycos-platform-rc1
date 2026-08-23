import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const project = resolve(import.meta.dirname, '..');
const roles = readFileSync(resolve(project, 'db/ep03/sql/000_roles.sql'), 'utf8');
const schema = readFileSync(resolve(project, 'db/ep03/sql/001_schema_rls.sql'), 'utf8');
const runtime = readFileSync(resolve(project, 'db/ep03/tests/runtime-isolation.sql'), 'utf8');
const network = readFileSync(resolve(project, 'bicep/network/main.bicep'), 'utf8');
const appNsg = readFileSync(resolve(project, 'bicep/network/modules/application-nsg.bicep'), 'utf8');
const dbNsg = readFileSync(resolve(project, 'bicep/network/modules/database-nsg.bicep'), 'utf8');
const all = `${roles}\n${schema}\n${runtime}\n${network}\n${appNsg}\n${dbNsg}`;

const checks = [
  ['canonical client_id key', /client_id uuid NOT NULL/.test(schema)],
  ['direct ownership on work items and notes', (schema.match(/client_id uuid NOT NULL/g) || []).length >= 2],
  ['RLS enabled for work items', /ALTER TABLE app\.work_items ENABLE ROW LEVEL SECURITY/.test(schema)],
  ['FORCE RLS for work items', /ALTER TABLE app\.work_items FORCE ROW LEVEL SECURITY/.test(schema)],
  ['RLS enabled for notes', /ALTER TABLE app\.work_item_notes ENABLE ROW LEVEL SECURITY/.test(schema)],
  ['FORCE RLS for notes', /ALTER TABLE app\.work_item_notes FORCE ROW LEVEL SECURITY/.test(schema)],
  ['runtime role has no bypass', /ycos_app_runtime NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS/.test(roles)],
  ['runtime role is not table owner', /CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION ycos_schema_owner/.test(schema)],
  ['no runtime role ownership grant', !/ALTER .* OWNER TO ycos_app_runtime/i.test(schema)],
  ['no broad PUBLIC grants', !/GRANT[\s\S]*TO PUBLIC/i.test(all)],
  ['transaction-local set_config', /set_config\('app\.client_id', p_client_id::text, true\)/.test(schema)],
  ['missing context fails closed', /app\.client_id is required/.test(schema)],
  ['invalid context fails closed', /app\.client_id must be a UUID/.test(schema)],
  ['RLS WITH CHECK present', (schema.match(/WITH CHECK \(client_id = app\.current_client_id\(\)\)/g) || []).length >= 2],
  ['ownership reassignment trigger', /prevent_client_ownership_reassignment/.test(schema)],
  ['composite client foreign key', /FOREIGN KEY \(work_item_id, client_id\)/.test(schema)],
  ['runtime tests cover commit and rollback', /COMMIT;[\s\S]*Missing context/.test(runtime) && /ROLLBACK;[\s\S]*rollback leaked context/.test(runtime)],
  ['future database source does not create server', !/resource .*Microsoft\.DBforPostgreSQL\/flexibleServers/.test(all)],
  ['public PostgreSQL interface denied', /publicNetworkAccess: 'disabled'/.test(network)],
  ['narrow application database port', /destinationPortRange: '5432'/.test(appNsg) && /destinationPortRange: '5432'/.test(dbNsg)],
  ['no broad PostgreSQL source', !/destinationPortRange: '5432'[\s\S]{0,500}sourceAddressPrefix: '\*'/i.test(`${appNsg}\n${dbNsg}`)],
  ['no hard-coded credential', !/(password|clientSecret|connectionString)\s*[:=]\s*['"][^'"]+/i.test(all)],
  ['no Saudi hard-code', !/saudi arabia east/i.test(all)],
];

let failures = 0;
for (const [name, passed] of checks) {
  if (passed) console.log(`PASS: ${name}`);
  else {
    failures += 1;
    console.error(`FAIL: ${name}`);
  }
}
if (failures) process.exit(1);
console.log(`EP-03 static security checks passed: ${checks.length}`);
