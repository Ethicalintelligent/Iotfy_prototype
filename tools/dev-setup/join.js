// Developer's computer, once:   node tools/dev-setup/join.js <Name>     (Claude Code runs it on "start my session")
// - this folder → dev/<name>, assigned to the developer
// - a second folder "<this folder>-neno" → neno/<name>, assigned to Neno (Claude Code)
// The branch checks in tools/git-hooks then refuse commits and pushes to any other branch.
// Never overwrites: stops if this folder has unsaved changes or is already assigned elsewhere.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { setupNames } from './rules.js';

const run = (cmd, args, opts = {}) =>
  String(
    execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }) ?? '',
  ).trim();
const git = (...args) => run('git', args);
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
const nenoDir = join(dirname(root), `${basename(root)}-neno`);

// 1. Checks first, so nothing is half done
const assigned = tryGit('config', '--get', 'iotify.branch');
if (assigned && assigned !== n.dev) stop(`This folder is already assigned to "${assigned}".`);
if (tryGit('config', '--get', 'iotify.role') === 'admin') stop('This folder is the admin copy.');
if (git('status', '--porcelain'))
  stop('This folder has unsaved changes. Commit or put them aside first.');
git('fetch', '--quiet', 'origin');
for (const b of [n.dev, n.neno])
  if (!tryGit('rev-parse', '--verify', '--quiet', `origin/${b}`))
    stop(`"${b}" doesn't exist yet. Ask the admin to set up ${n.name}.`);
if (existsSync(nenoDir) && tryGit('-C', nenoDir, 'symbolic-ref', '--short', 'HEAD') !== n.neno)
  stop(`The folder ${nenoDir} already exists and isn't Neno's copy.`);

// 2. Turn on the branch checks, and per-folder assignments
git('config', 'core.hooksPath', 'tools/git-hooks');
git('config', 'extensions.worktreeConfig', 'true');

// 3. Developer's folder → dev/<name>
if (git('symbolic-ref', '--short', 'HEAD') !== n.dev) {
  if (tryGit('rev-parse', '--verify', '--quiet', n.dev)) git('switch', '--quiet', n.dev);
  else git('switch', '--quiet', '--track', '-c', n.dev, `origin/${n.dev}`);
}
git('config', '--worktree', 'iotify.branch', n.dev);

// 4. Neno's folder → neno/<name>
if (!existsSync(nenoDir)) {
  if (tryGit('rev-parse', '--verify', '--quiet', n.neno))
    git('worktree', 'add', '--quiet', nenoDir, n.neno);
  else git('worktree', 'add', '--quiet', '--track', '-b', n.neno, nenoDir, `origin/${n.neno}`);
}
git('-C', nenoDir, 'config', '--worktree', 'iotify.branch', n.neno);
const env = join(root, '.env.local');
if (existsSync(env) && !existsSync(join(nenoDir, '.env.local')))
  copyFileSync(env, join(nenoDir, '.env.local'));

console.log(`✔ ${root}\n    → ${n.dev} (developer)`);
console.log(`✔ ${nenoDir}\n    → ${n.neno} (Neno / Claude Code)`);
console.log("Installing packages in Neno's folder…");
run('pnpm', ['install', '--silent'], {
  cwd: nenoDir,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});
console.log('✔ Done.');
