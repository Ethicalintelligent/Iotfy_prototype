// Called by the pre-commit and pre-push hooks in this folder. Keeps every copy of the project on its
// own branch: a developer's copy (the person and their Claude Code) pushes only dev/<name>, the
// admin anything but main. The assignment is this folder's git config (iotify.branch / iotify.role),
// written by tools/dev-setup/join.js. Rules: tools/dev-setup/rules.js, docs/DEVELOPER_BRANCHES.md.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { checkCommit, checkPush } from '../dev-setup/rules.js';

const git = (...args) => {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};

const who = {
  role: git('config', '--get', 'iotify.role') || undefined,
  branch: git('config', '--get', 'iotify.branch') || undefined,
};
const mode = process.argv[2];
let error = null;

if (mode === 'commit') {
  error = checkCommit(who, git('symbolic-ref', '--short', 'HEAD'));
} else if (mode === 'push') {
  // stdin: "<local ref> <local sha> <remote ref> <remote sha>" per ref being pushed
  const refs = readFileSync(0, 'utf8')
    .split('\n')
    .map((line) => line.trim().split(/\s+/)[2])
    .filter(Boolean);
  error = checkPush(who, refs);
}

if (error) {
  console.error(`\n✋ ${error}\n`);
  process.exit(1);
}
