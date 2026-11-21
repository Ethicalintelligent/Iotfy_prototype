// Admin: set up a new developer.   pnpm dev:setup <Name> [--check]
// Creates dev/<name> on GitHub from the latest main. The developer and their Claude Code both work
// on it. Never overwrites: if the branch already exists it warns and changes nothing. --check only reports.
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
const exists = git('ls-remote', '--heads', 'origin', n.dev).trim() !== '';

console.log(`Developer:        ${n.name}`);
console.log(`Branch:           ${n.dev}  ${exists ? '⚠ already exists' : '(free)'}`);
console.log(`Database:         ${n.database}  (Neon branch, checked by Claude Code)`);

if (exists) {
  console.error(`\n⚠ ${n.dev} already exists. Nothing was changed.`);
  process.exit(2);
}
if (check) process.exit(0);

const main = git('rev-parse', '--short', 'origin/main');
git('push', 'origin', `origin/main:refs/heads/${n.dev}`);
console.log(`\n✔ Created ${n.dev} from main (${main}).`);
