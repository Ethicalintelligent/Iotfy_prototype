import { DataError, type Connection, type Statement } from '../types';

interface Reply {
  rows?: unknown[];
  results?: unknown[][];
  error?: string;
  code?: string;
  detail?: string;
  hint?: string;
  constraint?: string;
  table?: string;
}

async function post(body: unknown): Promise<Reply> {
  let res: Response;
  try {
    res = await fetch('/__sql', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-iotify-sql': '1' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new DataError('The dev server is not reachable. Is `pnpm dev` running?', {
      code: 'offline',
    });
  }
  let reply: Reply;
  try {
    reply = (await res.json()) as Reply;
  } catch {
    throw new DataError(
      `The dev server answered ${res.status} without data. Restart \`pnpm dev\`.`,
      { code: 'bad_reply' },
    );
  }
  if (!res.ok || reply.error) {
    const { error, ...extra } = reply;
    throw new DataError(error || `Request failed (${res.status})`, extra);
  }
  return reply;
}

/** neon-dev: SQL runs in the Vite dev server; the connection string never reaches the browser. */
export function neonDevConnection(): Connection {
  return {
    mode: 'neon-dev',
    async query<R>(sql: string, params: unknown[] = []) {
      return ((await post({ sql, params })).rows ?? []) as R[];
    },
    async transaction(statements: Statement[]) {
      return (await post({ statements })).results ?? [];
    },
  };
}
