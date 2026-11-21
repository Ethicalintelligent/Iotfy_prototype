import { describe, expect, it } from 'vitest';
import { checkCommit, checkPush, normalizeName, setupNames } from './rules.js';

describe('setupNames', () => {
  it('builds both branches and the database from a name', () => {
    expect(setupNames(' Nadim ')).toEqual({
      name: 'nadim',
      dev: 'dev/nadim',
      neno: 'neno/nadim',
      database: 'iotfy_nadim',
    });
    expect(setupNames('Mohammed Ali')?.database).toBe('iotfy_mohammed_ali');
  });
  it('rejects names that cannot be branch names', () => {
    for (const bad of ['', 'a', '1abc', 'na/dim', 'x'.repeat(31), undefined])
      expect(normalizeName(bad)).toBeNull();
  });
});

describe('checkPush', () => {
  const nadim = { branch: 'dev/nadim' };
  const neno = { branch: 'neno/nadim' };
  it('lets each copy push only its own branch', () => {
    expect(checkPush(nadim, ['refs/heads/dev/nadim'])).toBeNull();
    expect(checkPush(neno, ['refs/heads/neno/nadim'])).toBeNull();
    expect(checkPush(neno, ['refs/heads/dev/nadim'])).toMatch(/assigned to "neno\/nadim"/);
    expect(checkPush(nadim, ['refs/heads/dev/irfan'])).toMatch(/refused/);
    expect(checkPush(nadim, ['refs/heads/main'])).toMatch(/refused/);
    expect(checkPush(nadim, ['refs/heads/dev/nadim', 'refs/heads/main'])).toMatch(/main/);
  });
  it('refuses a copy with no assignment', () => {
    expect(checkPush({}, ['refs/heads/dev/nadim'])).toMatch(/start my session/);
  });
  it('lets the admin push anything except main', () => {
    expect(
      checkPush({ role: 'admin' }, ['refs/heads/dev/nadim', 'refs/heads/neno/nadim']),
    ).toBeNull();
    expect(checkPush({ role: 'admin' }, ['refs/heads/main'])).toMatch(/pull request/);
  });
  it('ignores tags', () => {
    expect(checkPush(nadim, ['refs/tags/v1'])).toBeNull();
  });
});

describe('checkCommit', () => {
  it('allows commits only on the assigned branch', () => {
    expect(checkCommit({ branch: 'dev/nadim' }, 'dev/nadim')).toBeNull();
    expect(checkCommit({ branch: 'dev/nadim' }, 'main')).toMatch(/switch to it/);
    expect(checkCommit({}, 'dev/nadim')).toMatch(/start my session/);
    expect(checkCommit({ role: 'admin' }, 'admin/x')).toBeNull();
    expect(checkCommit({ role: 'admin' }, 'main')).toMatch(/refused/);
  });
});
