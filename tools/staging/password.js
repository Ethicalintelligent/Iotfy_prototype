// The staging site's password (Vercel's free plan has no built-in password protection).
// The browser asks once ("Sign in to IoTIFY staging"); any user name, the password is the host's
// secret STAGING_PASSWORD. Without that secret the site stays closed. Covers every page, file and
// /api/sql. On Vercel Pro you can switch to Vercel's own Password Protection instead.

/** Same answer time whatever the guess, so the password can't be found letter by letter. */
function same(a, b) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/**
 * Returns a Response that blocks the request, or null when the visitor may continue.
 * @param {Request} request
 * @param {string | undefined} password
 */
export function passwordGate(request, password) {
  if (!password)
    return new Response('Staging is closed: STAGING_PASSWORD is not set on the server.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Basic ')) {
    let given = '';
    try {
      given = atob(auth.slice(6));
    } catch {
      /* not base64: refused below */
    }
    const pass = given.slice(given.indexOf(':') + 1);
    if (given.includes(':') && same(pass, password)) return null;
  }
  return new Response('Password required.', {
    status: 401,
    headers: {
      'www-authenticate': 'Basic realm="IoTIFY staging", charset="UTF-8"',
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
