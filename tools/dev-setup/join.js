// Developer's computer, once:   node tools/dev-setup/join.js <Name>     (Claude Code runs it on "start my session")
// This folder → dev/<name>, used by the developer and their Claude Code.
// The branch checks in tools/git-hooks then refuse commits and pushes to any other branch.
// Never overwrites: stops if this folder has unsaved changes or is already assigned elsewhere.
import { execFileSync } from 'node:child_process';
import { setupNames } from './rules.js';

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const tryGit = (...args) => {
  try {
    return git(...args);
  } catch {
    return '';
  }
};
const stop = (msg) => {
  console.error(`\n⚠ ${msg} Nothing was changed.`);
  process.exit(2);
};

const raw = process.argv.slice(2).join(' ');
const n = setupNames(raw);
if (!n) stop(`"${raw}" can't be used as a developer name.`);

const root = git('rev-parse', '--show-toplevel');

// 1. Checks first, so nothing is half done
const assigned = tryGit('config', '--get', 'iotify.branch');
if (assigned && assigned !== n.dev) stop(`This folder is already assigned to "${assigned}".`);
if (tryGit('config', '--get', 'iotify.role') === 'admin') stop('This folder is the admin copy.');
if (git('status', '--porcelain'))
  stop('This folder has unsaved changes. Commit or put them aside first.');
git('fetch', '--quiet', 'origin');
if (!tryGit('rev-parse', '--verify', '--quiet', `origin/${n.dev}`))
  stop(`"${n.dev}" doesn't exist yet. Ask the admin to set up ${n.name}.`);

// 2. Turn on the branch checks
git('config', 'core.hooksPath', 'tools/git-hooks');

// 3. This folder → dev/<name>
if (git('symbolic-ref', '--short', 'HEAD') !== n.dev) {
  if (tryGit('rev-parse', '--verify', '--quiet', n.dev)) git('switch', '--quiet', n.dev);
  else git('switch', '--quiet', '--track', '-c', n.dev, `origin/${n.dev}`);
}
git('config', 'iotify.branch', n.dev);

console.log(`✔ ${root}\n    → ${n.dev} (developer and Claude Code)`);
console.log('✔ Done.');
