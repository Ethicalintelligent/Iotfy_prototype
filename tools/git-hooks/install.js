// Runs on `pnpm install` (package.json "prepare"): turns on the branch checks in tools/git-hooks.
// Silently does nothing where there is no git repository (Vercel, CI artefacts).
import { execFileSync } from 'node:child_process';

try {
  execFileSync('git', ['rev-parse', '--git-dir'], { stdio: 'ignore' });
  execFileSync('git', ['config', 'core.hooksPath', 'tools/git-hooks'], { stdio: 'ignore' });
} catch {
  // not a git checkout: nothing to install
}
