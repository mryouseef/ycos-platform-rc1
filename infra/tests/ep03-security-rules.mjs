import { readFileSync } from 'node:fs';

export function scanSqlFixture(content) {
  const hits = [];
  if (/CLIENT_SCOPED/i.test(content) && !/ENABLE ROW LEVEL SECURITY/i.test(content)) hits.push('EP03-NEG-001');
  if (/ENABLE ROW LEVEL SECURITY/i.test(content) && !/FORCE ROW LEVEL SECURITY/i.test(content)) hits.push('EP03-NEG-002');
  if (/CREATE ROLE[\s\S]*\bBYPASSRLS\b/i.test(content)) hits.push('EP03-NEG-003');
  if (/CREATE POLICY[\s\S]*(USING\s*\(\s*true\s*\)|WITH CHECK\s*\(\s*true\s*\))/i.test(content)) hits.push('EP03-NEG-004');
  if (/set_config\s*\(\s*'app\.client_id'\s*,[\s\S]*,\s*false\s*\)/i.test(content)) hits.push('EP03-NEG-005');
  if (/CLIENT_SCOPED/i.test(content) && !/prevent_client_ownership_reassignment/i.test(content)) hits.push('EP03-NEG-007');
  return hits;
}

export function scanBicepFixture(content) {
  const hits = [];
  if (/access:\s*'Allow'/i.test(content) && /destinationPortRange:\s*'5432'/i.test(content) && /sourceAddressPrefix:\s*'\*'/i.test(content)) hits.push('EP03-NEG-006');
  if (/Microsoft\.DBforPostgreSQL\/flexibleServers/i.test(content) && /publicNetworkAccess:\s*'Enabled'/i.test(content)) hits.push('EP03-NEG-008');
  return hits;
}

export function read(file) {
  return readFileSync(file, 'utf8');
}
