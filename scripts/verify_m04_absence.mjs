import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'

const runtimeRoots = ['src/domain', 'src/application', 'src/adapters', 'src/infrastructure', 'app', 'components']
const provider = /(@azure\/|aws-sdk|@google-cloud|supabase|auth0|openai|anthropic|bedrock)/iu
const network = /(\bfetch\s*\(|axios|\.request\s*\(|node:http|node:https)/iu
const canonical = 'infra/pn03/migrations/001_work_items.sql'
const ileMigration = 'infra/ile01/migrations/001_ile_rls.sql'
const p1IdentityMigration = 'infra/p1/migrations/001_identity_foundation.sql'
const p1MembershipRlsMigration = 'infra/p1/migrations/002_membership_rls.sql'
const approvedMigrations = new Map([
  [canonical, '4160f13484ad9a722de23718d489251f9fa70b9f77052a69c4c2899287d8f736'],
  [ileMigration, '983794328c27ec380369c49e3e9a1801567c1674da8de80420c116962f39b60e'],
  [p1IdentityMigration, 'ba92c8b473faff65cc26da7af569efad0240a4b87a2f223b2bda9d8a5dca269a'],
  [p1MembershipRlsMigration, '1b80b4473ffa69ef075aa2ab41249a815ca51d5e7b3af08480c789d083a08f28'],
])
const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
const digest = file => crypto.createHash('sha256').update(read(file)).digest('hex')
const files = dir => !fs.existsSync(dir) ? [] : fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)])
const specs = source => [...source.matchAll(/(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g)].map(match => match[1])

function migrationIssues(base) {
  const found = files(path.join(base, 'infra')).filter(file => /\/migrations\/.*\.sql$/.test(file.replaceAll('\\', '/'))).map(file => path.relative(base, file).replaceAll('\\', '/'))
  const issues = []
  for (const file of found) {
    if (!approvedMigrations.has(file)) issues.push({ code: 'UNAUTHORIZED_MIGRATION', file })
    else if (digest(path.join(base, file)) !== approvedMigrations.get(file)) issues.push({ code: file === canonical ? 'CANONICAL_MIGRATION_HASH_MISMATCH' : 'ILE_MIGRATION_HASH_MISMATCH', file })
  }
  return issues
}

export function analyzeArchitecture(base = process.cwd()) {
  const issues = []
  const runtimeFiles = runtimeRoots.flatMap(root => files(path.join(base, root))).filter(file => /\.(ts|tsx|js|mjs)$/.test(file))
  for (const file of runtimeFiles) {
    const source = read(file); const relative = path.relative(base, file).replaceAll('\\', '/')
    for (const specifier of specs(source)) {
      if (relative.startsWith('src/domain/') && /(ports|adapters|infrastructure|http)/iu.test(specifier)) issues.push({ code: specifier.includes('ports') ? 'DOMAIN_IMPORTS_PORT' : specifier.includes('adapters') ? 'DOMAIN_IMPORTS_ADAPTER' : 'DOMAIN_IMPORTS_INFRASTRUCTURE', file: relative, specifier })
      if (relative.includes('/ports/') && /(adapters|infrastructure)/iu.test(specifier)) issues.push({ code: 'PORT_IMPORTS_ADAPTER_OR_INFRASTRUCTURE', file: relative, specifier })
      if (relative.includes('/ports/') && provider.test(specifier)) issues.push({ code: 'PORT_IMPORTS_PROVIDER_SDK', file: relative, specifier })
      if (relative.startsWith('src/adapters/') && !/ports/iu.test(specifier)) issues.push({ code: 'ADAPTER_MISSING_PORT_DEPENDENCY', file: relative, specifier })
    }
    if (network.test(source) && !/fetch\(['"]\/api\/local\//.test(source)) issues.push({ code: 'RUNTIME_NETWORK_CALL', file: relative })
    if (provider.test(source)) issues.push({ code: 'RUNTIME_PROVIDER_SDK', file: relative })
  }
  for (const file of [...files(path.join(base, 'app')), ...files(path.join(base, 'components')), ...files(path.join(base, 'client'))]) if (/from ['"]pg['"]/.test(read(file))) issues.push({ code: 'CLIENT_IMPORTS_PG', file: path.relative(base, file).replaceAll('\\', '/') })
  const packageText = read(path.join(base, 'package.json')) + '\n' + read(path.join(base, 'pnpm-lock.yaml'))
  const packageJson = JSON.parse(read(path.join(base, 'package.json')) || '{}'); const direct = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) }
  if (provider.test(packageText)) issues.push({ code: 'PROVIDER_PACKAGE_OR_LOCKFILE', file: 'package.json|pnpm-lock.yaml' })
  if (Object.keys(direct).some(name => /^(prisma|drizzle|sequelize|typeorm|postgres|mysql|sqlite)$/iu.test(name))) issues.push({ code: 'DATABASE_OR_ORM_PACKAGE', file: 'package.json' })
  if (direct.pg && !/^\^?8\.23\.0$/.test(direct.pg)) issues.push({ code: 'UNAPPROVED_PG_VERSION', file: 'package.json' })
  if (direct.pg && !/pg@8\.23\.0|pg:\s*8\.23\.0/.test(packageText)) issues.push({ code: 'PG_LOCKFILE_MISSING', file: 'pnpm-lock.yaml' })
  issues.push(...migrationIssues(base))
  return { runtimeFiles: runtimeFiles.map(file => path.relative(base, file).replaceAll('\\', '/')), issues }
}

export function runNegativeFixtures() {
  const scenarios = [['DOMAIN_IMPORTS_PORT', 'src/domain/bad.ts', "import x from '../application/ports/identity-port'"], ['DOMAIN_IMPORTS_ADAPTER', 'src/domain/bad.ts', "import x from '../adapters/provider'"], ['PORT_IMPORTS_ADAPTER_OR_INFRASTRUCTURE', 'src/application/ports/bad.ts', "import x from '../../adapters/provider'"], ['PORT_IMPORTS_PROVIDER_SDK', 'src/application/ports/bad.ts', "import x from 'aws-sdk'"], ['RUNTIME_NETWORK_CALL', 'src/application/bad.ts', "fetch('https://forbidden.invalid')"], ['PROVIDER_PACKAGE_OR_LOCKFILE', 'package.json', '{"dependencies":{"aws-sdk":"0"}}']]
  return scenarios.map(([expected, file, body]) => { const base = fs.mkdtempSync(path.join(os.tmpdir(), 'm04-architecture-fixture-')); fs.mkdirSync(path.dirname(path.join(base, file)), { recursive: true }); fs.writeFileSync(path.join(base, file), body); if (file !== 'package.json') fs.writeFileSync(path.join(base, 'package.json'), '{}'); fs.writeFileSync(path.join(base, 'pnpm-lock.yaml'), ''); return { expected, found: analyzeArchitecture(base).issues.some(issue => issue.code === expected) } })
}

const report = analyzeArchitecture(); const fixtures = runNegativeFixtures()
const checks = [['Runtime files inspected', report.runtimeFiles.length > 0], ['No forbidden domain/port/provider/network boundary', !report.issues.some(issue => /^(DOMAIN_|PORT_|RUNTIME_|PROVIDER_)/.test(issue.code))], ['Only pg 8.23.0 server dependency', !report.issues.some(issue => /^(CLIENT_IMPORTS_PG|UNAPPROVED_PG_VERSION|PG_LOCKFILE_MISSING|DATABASE_OR_ORM_PACKAGE)/.test(issue.code))], ['Only approved migrations unchanged', !report.issues.some(issue => /MIGRATION/.test(issue.code))], ['Negative fixtures fail closed', fixtures.every(result => result.found)]]
fs.mkdirSync('artifacts/m04', { recursive: true }); fs.writeFileSync('artifacts/m04/network-and-provider-absence-evidence.md', ['# M-04 Network and Provider Absence Evidence', '', ...checks.map(([name, pass]) => `- ${name}: ${pass ? 'PASS' : 'FAIL'}`), ''].join('\n'))
if (checks.some(([, pass]) => !pass)) process.exit(1)
console.log('M04_ABSENCE_PASS')
