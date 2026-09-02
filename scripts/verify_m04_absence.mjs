import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'

const runtimeRoots = ['src/domain', 'src/application', 'src/adapters', 'src/infrastructure', 'src/p1', 'app', 'components']
const foreignProvider = /(@azure\/|aws-sdk|@google-cloud|auth0|openai|anthropic|bedrock)/iu
const supabasePackage = /^@supabase\/[a-z0-9-]+$/iu
const serviceRole = /(SUPABASE_SERVICE_ROLE|SERVICE_ROLE_KEY)/iu
const approvedP1D2BPackages = new Map([['@supabase/ssr', '0.12.5'], ['@supabase/supabase-js', '2.112.4']])
const approvedSupabaseLockPackages = new Set(['@supabase/auth-js@2.112.4', '@supabase/functions-js@2.112.4', '@supabase/phoenix@0.4.5', '@supabase/postgrest-js@2.112.4', '@supabase/realtime-js@2.112.4', '@supabase/ssr@0.12.5', '@supabase/storage-js@2.112.4', '@supabase/supabase-js@2.112.4'])
const approvedP1D2BImports = new Map([['src/p1/auth/supabase-server-client.ts', new Set(['@supabase/ssr'])]])
const network = /(\bfetch\s*\(|axios|\.request\s*\(|node:http|node:https)/iu
const canonical = 'infra/pn03/migrations/001_work_items.sql'
const ileMigration = 'infra/ile01/migrations/001_ile_rls.sql'
const p1IdentityMigration = 'infra/p1/migrations/001_identity_foundation.sql'
const p1MembershipRlsMigration = 'infra/p1/migrations/002_membership_rls.sql'
const p2ConsultingWorkflowMigration = 'infra/p2/migrations/001_consulting_workflow.sql'
const p2EligibilityAuthorityMigration = 'infra/p2/migrations/002_membership_eligibility_authority.sql'
const p2PrivilegedOwnershipTransferMigration = 'infra/p2/migrations/003_MANUAL_PRIVILEGED_ownership_transfer.sql'
const approvedMigrations = new Map([
  [canonical, '41273c18b36bb1615f8bf33c0dff24ea6fc2ced814a14d1f106636aab066181c'],
  [ileMigration, '10f3a5739a5ee4aaf4d16b89d062a9a80abf856c309100f1aa9796ee19283a4b'],
  [p1IdentityMigration, 'ecdf6f9f53498ca80c8f8fd68fc1b6d9c9c6311bef17c96f65e33c36c8396f0d'],
  [p1MembershipRlsMigration, '2cf3bb26be10537b2ed979de0f8c90585a382e20782f966cb533c2f553c0169c'],
  [p2ConsultingWorkflowMigration, 'c06338ecdc0da4d906dbada3c0365043970d215791051b395dfaaee38108e934'],
  [p2EligibilityAuthorityMigration, 'b213326e76fbe1bc380a9116ca087b287de80a38b2e5b76b0be2ba1ef990d121'],
  [p2PrivilegedOwnershipTransferMigration, 'ad857753aecd48b97e338f971792fd54b64aa8382fda1c1ff9fc0bd68825b291'],
])
const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
const digest = file => crypto.createHash('sha256').update(read(file)).digest('hex')
const files = dir => !fs.existsSync(dir) ? [] : fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)])
const specs = source => [...source.matchAll(/(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g)].map(match => match[1])
const supabaseReferences = source => [...source.matchAll(/@supabase\/[a-z0-9-]+/giu)].map(match => match[0])
const isApprovedP1D2BImport = (relative, specifier) => approvedP1D2BImports.get(relative)?.has(specifier) === true

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
    const specifiers = specs(source); const providerReferences = supabaseReferences(source)
    for (const specifier of specifiers) {
      if (relative.startsWith('src/domain/') && /(ports|adapters|infrastructure|http)/iu.test(specifier)) issues.push({ code: specifier.includes('ports') ? 'DOMAIN_IMPORTS_PORT' : specifier.includes('adapters') ? 'DOMAIN_IMPORTS_ADAPTER' : 'DOMAIN_IMPORTS_INFRASTRUCTURE', file: relative, specifier })
      if (relative.includes('/ports/') && /(adapters|infrastructure)/iu.test(specifier)) issues.push({ code: 'PORT_IMPORTS_ADAPTER_OR_INFRASTRUCTURE', file: relative, specifier })
      if (relative.includes('/ports/') && (foreignProvider.test(specifier) || supabasePackage.test(specifier))) issues.push({ code: 'PORT_IMPORTS_PROVIDER_SDK', file: relative, specifier })
      if (relative.startsWith('src/adapters/') && !/ports/iu.test(specifier)) issues.push({ code: 'ADAPTER_MISSING_PORT_DEPENDENCY', file: relative, specifier })
    }
    if (network.test(source) && !/fetch\(['"]\/api\/local\//.test(source)) issues.push({ code: 'RUNTIME_NETWORK_CALL', file: relative })
    if (foreignProvider.test(source) || serviceRole.test(source) || providerReferences.some(specifier => !isApprovedP1D2BImport(relative, specifier))) issues.push({ code: 'RUNTIME_PROVIDER_SDK', file: relative })
    if ((relative.startsWith('app/') || relative.startsWith('components/') || relative.startsWith('client/')) && providerReferences.length > 0) issues.push({ code: 'CLIENT_IMPORTS_SUPABASE', file: relative })
    if (providerReferences.length > 0 && /\.(?:from|rpc|schema)\s*\(/u.test(source)) issues.push({ code: 'SUPABASE_DATA_API_BUSINESS_USAGE', file: relative })
  }
  for (const file of [...files(path.join(base, 'app')), ...files(path.join(base, 'components')), ...files(path.join(base, 'client'))]) if (/from ['"]pg['"]/.test(read(file))) issues.push({ code: 'CLIENT_IMPORTS_PG', file: path.relative(base, file).replaceAll('\\', '/') })
  const lockfileText = read(path.join(base, 'pnpm-lock.yaml'))
  const packageText = read(path.join(base, 'package.json')) + '\n' + lockfileText
  const packageJson = JSON.parse(read(path.join(base, 'package.json')) || '{}'); const direct = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) }
  for (const [name, version] of Object.entries(direct)) if (name.startsWith('@supabase/')) {
    const approvedVersion = approvedP1D2BPackages.get(name)
    if (!approvedVersion) issues.push({ code: 'UNAPPROVED_SUPABASE_PACKAGE', file: 'package.json', name })
    else if (version !== approvedVersion) issues.push({ code: 'UNAPPROVED_SUPABASE_PACKAGE_VERSION', file: 'package.json', name, version })
  }
  const lockEntries = [...lockfileText.matchAll(/'(@supabase\/[a-z0-9-]+@\d+\.\d+\.\d+(?:\([^']+\))?)':/giu)].map(match => match[1].split('(')[0])
  if (lockEntries.some(entry => !approvedSupabaseLockPackages.has(entry))) issues.push({ code: 'UNAPPROVED_SUPABASE_LOCKFILE_ENTRY', file: 'pnpm-lock.yaml' })
  if (foreignProvider.test(packageText)) issues.push({ code: 'PROVIDER_PACKAGE_OR_LOCKFILE', file: 'package.json|pnpm-lock.yaml' })
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
const checks = [['Runtime files inspected', report.runtimeFiles.length > 0], ['No forbidden domain/port/provider/network boundary', !report.issues.some(issue => /^(DOMAIN_|PORT_|RUNTIME_|PROVIDER_|CLIENT_IMPORTS_SUPABASE|SUPABASE_DATA_API_BUSINESS_USAGE|UNAPPROVED_SUPABASE_)/.test(issue.code))], ['Only pg 8.23.0 server dependency', !report.issues.some(issue => /^(CLIENT_IMPORTS_PG|UNAPPROVED_PG_VERSION|PG_LOCKFILE_MISSING|DATABASE_OR_ORM_PACKAGE)/.test(issue.code))], ['Only approved migrations unchanged', !report.issues.some(issue => /MIGRATION/.test(issue.code))], ['Negative fixtures fail closed', fixtures.every(result => result.found)]]
fs.mkdirSync('artifacts/m04', { recursive: true }); fs.writeFileSync('artifacts/m04/network-and-provider-absence-evidence.md', ['# M-04 Network and Provider Absence Evidence', '', ...checks.map(([name, pass]) => `- ${name}: ${pass ? 'PASS' : 'FAIL'}`), ''].join('\n'))
if (checks.some(([, pass]) => !pass)) process.exit(1)
console.log('M04_ABSENCE_PASS')
