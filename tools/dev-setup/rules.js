// Branch rules for developer setups (docs/DEVELOPER_BRANCHES.md). Pure functions, unit-tested.
// Each developer gets one branch, dev/<name>, used by the person and their Claude Code, and the Neon branch iotfy_<name>.

/** "Nadim " → "nadim". Returns null when the name can't be used in branch names. */
export function normalizeName(raw) {
  const name = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  return /^[a-z][a-z0-9-]{1,29}$/.test(name) ? name : null;
}

/** Everything a developer setup creates, from the developer's name. */
export function setupNames(raw) {
  const name = normalizeName(raw);
  if (!name) return null;
  return {
    name,
    dev: `dev/${name}`,
    database: `iotfy_${name.replace(/-/g, '_')}`,
  };
}

const UNSET_HELP =
  'This copy of the project has no assigned branch yet. Ask Claude Code to "start my session" (docs/DEVELOPER_BRANCHES.md).';

/**
 * May this copy push these refs?  who = { role: 'admin' | undefined, branch: 'dev/nadim' | undefined }
 * refs = remote ref names being updated, for example ['refs/heads/dev/nadim'].  Returns an error text, or null when allowed.
 */
export function checkPush(who, refs) {
  for (const ref of refs) {
    if (!ref.startsWith('refs/heads/')) continue; // tags etc. are not branches
    const target = ref.slice('refs/heads/'.length);
    if (who.role === 'admin') continue; // the admin works directly on main and may push any branch
    if (!who.branch) return `Push refused. ${UNSET_HELP}`;
    if (target !== who.branch)
      return `Push to "${target}" refused. You are assigned to "${who.branch}" and may push only there.`;
  }
  return null;
}

/** May this copy commit on its current branch? Returns an error text, or null when allowed. */
export function checkCommit(who, current) {
  if (who.role === 'admin') return null; // the admin commits directly on main
  if (!who.branch) return `Commit refused. ${UNSET_HELP}`;
  if (current !== who.branch)
    return `Commit on "${current}" refused. You are assigned to "${who.branch}"; switch to it first.`;
  return null;
}
