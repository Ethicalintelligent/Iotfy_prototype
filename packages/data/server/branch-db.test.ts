// Neon Database app: a developer sees only the database labelled with their own branch's name.
import { describe, expect, it } from 'vitest';
import { decideAccess } from './branch-db.js';

const dev = { role: '', branch: 'dev/nadim', checkedOut: 'dev/nadim', hasUrl: true };

describe('decideAccess', () => {
  it('opens the database when the owner label matches the branch', () => {
    expect(decideAccess({ ...dev, owners: ['nadim'] })).toEqual({
      state: 'ok',
      developer: 'nadim',
    });
  });
  it('hides the menu for the admin (main), whatever the database says', () => {
    expect(decideAccess({ ...dev, role: 'admin', owners: ['nadim'] }).state).toBe('hidden');
  });
  it('locks when the database belongs to another developer', () => {
    expect(decideAccess({ ...dev, owners: ['irfan'] })).toMatchObject({
      state: 'locked',
      reason: 'mismatch',
    });
  });
  it('locks when the database has no owner label (e.g. main), or the table is missing', () => {
    expect(decideAccess({ ...dev, owners: [] }).reason).toBe('no_label');
    expect(decideAccess({ ...dev, owners: null }).reason).toBe('no_label');
  });
  it('locks when the label is ambiguous', () => {
    expect(decideAccess({ ...dev, owners: ['nadim', 'irfan'] }).reason).toBe('mismatch');
  });
  it('locks without a dev/<name> branch, or when another branch is checked out', () => {
    expect(decideAccess({ ...dev, branch: '', owners: ['nadim'] }).reason).toBe('no_branch');
    expect(decideAccess({ ...dev, branch: 'main', owners: ['nadim'] }).reason).toBe('no_branch');
    expect(decideAccess({ ...dev, checkedOut: 'dev/irfan', owners: ['nadim'] }).reason).toBe(
      'wrong_checkout',
    );
  });
  it('locks without a database address', () => {
    expect(decideAccess({ ...dev, hasUrl: false }).reason).toBe('no_database');
  });
  it('does not open before the label has been read', () => {
    expect(decideAccess(dev).state).toBe('locked');
  });
});
