import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const sentinel = 'EP09_REUSABLE_SENTINEL';
const result = spawnSync('pnpm', ['run', 'build'], { cwd: root, encoding: 'utf8', env: { ...process.env, EP09_REUSABLE_SENTINEL: sentinel } });
if (result.status !== 0) throw new Error(`EP09_SENTINEL_BUILD_FAILED:${result.status ?? 1}`);
const locations = [];
const scan = (path) => {
  if (!existsSync(path)) return;
  const metadata = statSync(path);
  if (metadata.isDirectory()) {
    for (const entry of readdirSync(path)) scan(join(path, entry));
    return;
  }
  if (readFileSync(path).includes(sentinel)) locations.push(path);
};
scan(join(root, '.next'));
scan(join(root, 'artifacts/go-03/ep-09/generated'));
if (result.stdout.includes(sentinel) || result.stderr.includes(sentinel)) locations.push('build-log');
if (locations.length) throw new Error(`EP09_SENTINEL_LEAKAGE_DETECTED:${locations.join(',')}`);
console.log('EP09_SENTINEL_LEAKAGE_NOT_DETECTED targets=.next,generated,build-log');
