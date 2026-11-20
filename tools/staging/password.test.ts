import { describe, expect, it } from 'vitest';
import { passwordGate } from './password.js';

const req = (auth?: string) =>
  new Request('https://staging.example/admin/', {
    headers: auth ? { authorization: auth } : {},
  });
const basic = (s: string) => 'Basic ' + btoa(s);

describe('staging password', () => {
  it('stays closed when no password is set on the server', () => {
    expect(passwordGate(req(basic('a:b')), undefined)?.status).toBe(503);
  });
  it('asks for the password', () => {
    const r = passwordGate(req(), 'secret-1');
    expect(r?.status).toBe(401);
    expect(r?.headers.get('www-authenticate')).toMatch(/Basic/);
  });
  it('refuses a wrong password', () => {
    expect(passwordGate(req(basic('anyone:wrong')), 'secret-1')?.status).toBe(401);
    expect(passwordGate(req(basic('secret-1')), 'secret-1')?.status).toBe(401);
    expect(passwordGate(req('Basic %%%'), 'secret-1')?.status).toBe(401);
  });
  it('lets in the right password with any name', () => {
    expect(passwordGate(req(basic('anyone:secret-1')), 'secret-1')).toBeNull();
    expect(passwordGate(req(basic(':secret-1')), 'secret-1')).toBeNull();
  });
});
