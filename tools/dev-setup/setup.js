// Admin: set up a new developer.   pnpm dev:setup <Name> [--check]
// Creates dev/<name> and neno/<name> on GitHub from the latest main. Never overwrites: if either
// branch already exists it warns and changes nothing. --check only reports.
// The database (Neon branch iotfy_<name>, copied from Neon main) is created by Claude Code through
// its Neon connection; see docs/DEVELOPER_BRANCHES.md → "Setting up a developer".
import { execFileSync } from 'node:child_process';
import { setupNames } from './rules.js';

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const args = process.argv.slice(2);
const check = args.includes('--check');
const raw = args.filter((a) => !a.startsWith('--')).join(' ');
const n = setupNames(raw);
if (!n) {
  console.error(
    `"${raw}" can't be used. Use a first name: letters, digits and dashes, 2–30 characters.`,
  );
  process.exit(1);
}

git('fetch', '--quiet', 'origin', 'main');
const existing = git('ls-remote', '--heads', 'origin', n.dev, n.neno)
  .split('\n')
  .filter(Boolean)
  .map((line) => line.split('refs/heads/')[1]);

console.log(`Developer:        ${n.name}`);
console.log(
  `Developer branch: ${n.dev}  ${existing.includes(n.dev) ? '⚠ already exists' : '(free)'}`,
);
console.log(
  `Neno branch:      ${n.neno}  ${existing.includes(n.neno) ? '⚠ already exists' : '(free)'}`,
);
console.log(`Database:         ${n.database}  (Neon branch, checked by Claude Code)`);

if (existing.length) {
  console.error(
    `\n⚠ ${existing.join(' and ')} already exist${existing.length === 1 ? 's' : ''}. Nothing was changed.`,
  );
  process.exit(2);
}
if (check) process.exit(0);

const main = git('rev-parse', '--short', 'origin/main');
git(
  'push',
  '--atomic',
  'origin',
  `origin/main:refs/heads/${n.dev}`,
  `origin/main:refs/heads/${n.neno}`,
);
console.log(`\n✔ Created ${n.dev} and ${n.neno} from main (${main}).`);
