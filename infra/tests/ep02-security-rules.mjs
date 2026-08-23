import { readFileSync } from 'node:fs';

const rules = [
  ['EP02-SEC-001', /Microsoft\.Network\/publicIPAddresses/i],
  ['EP02-SEC-002', /Microsoft\.Network\/(applicationGateways|frontDoors|azureFirewalls|natGateways)/i],
  ['EP02-SEC-003', /resource\s+\w+\s+'Microsoft\.(DBforPostgreSQL|Storage|KeyVault)\//i],
  ['EP02-SEC-004', /publicNetworkAccess\s*:\s*'Enabled'/i],
  ['EP02-SEC-005', /access\s*:\s*'Allow'[\s\S]{0,500}sourceAddressPrefix\s*:\s*'\*'[\s\S]{0,500}destinationAddressPrefix\s*:\s*'\*'/i],
  ['EP02-SEC-006', /(clientSecret|password|privateKey|connectionString)\b[\s\w]*=\s*['"][^'"]+/i],
  ['EP02-SEC-007', /saudi arabia east/i],
  ['EP02-SEC-008', /real[-_ ]?(customer|client|production)\s*data/i],
  ['EP02-SEC-009', /real[-_ ]?(client|workforce)\s*identity/i],
  ['EP02-SEC-010', /(openai|anthropic|gemini|embedding|rag)\b/i],
  ['EP02-SEC-011', /(az\s+deployment|bicep\s+deploy|terraform\s+apply)/i],
];

export function scanText(content) {
  return rules.filter(([, pattern]) => pattern.test(content)).map(([code]) => code);
}

export function scanFile(file) {
  return scanText(readFileSync(file, 'utf8'));
}

export const ruleCodes = rules.map(([code]) => code);
