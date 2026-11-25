// IT-0038. A user's password is never stored: only a one-way PBKDF2-SHA256 hash in
// core.users.password_hash, as `pbkdf2-sha256$210000$<salt base64>$<hash base64>` (WebCrypto,
// 16-byte random salt, 210 000 iterations, 32-byte hash).

export const PBKDF2_ITERATIONS = 210000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

const toBase64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const fromBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

/** The value for core.users.password_hash. */
export async function hashPassword(
  password: string,
  salt: Uint8Array = crypto.getRandomValues(new Uint8Array(SALT_BYTES)),
): Promise<string> {
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** True when the password matches a stored hash. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iter, salt, hash] = stored.split('$');
  if (scheme !== 'pbkdf2-sha256' || !iter || !salt || !hash) return false;
  const got = await derive(password, fromBase64(salt), Number(iter));
  return toBase64(got) === hash;
}
