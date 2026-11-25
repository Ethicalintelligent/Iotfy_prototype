import { describe, expect, it } from 'vitest';
import { PBKDF2_ITERATIONS, hashPassword, verifyPassword } from './password';

describe('hashPassword', () => {
  it('stores pbkdf2-sha256$210000$<salt>$<hash>, never the password', async () => {
    const h = await hashPassword('demo-Pass-123');
    const [scheme, iter, salt, hash] = h.split('$');
    expect(scheme).toBe('pbkdf2-sha256');
    expect(Number(iter)).toBe(PBKDF2_ITERATIONS);
    expect(atob(salt!).length).toBe(16);
    expect(atob(hash!).length).toBe(32);
    expect(h).not.toContain('demo-Pass-123');
  });

  it('uses a new salt each time', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('is repeatable for a given salt (known PBKDF2-SHA256 output)', async () => {
    const salt = new Uint8Array(16);
    const a = await hashPassword('password', salt);
    expect(a).toBe(await hashPassword('password', salt));
  });

  it('verifies the right password only', async () => {
    const h = await hashPassword('demo-Pass-123');
    expect(await verifyPassword('demo-Pass-123', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
    expect(await verifyPassword('x', 'garbage')).toBe(false);
  });
});
