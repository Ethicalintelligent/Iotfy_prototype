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

/** /__sql in the Vite dev server; /api/sql on the staging server (docs/STAGING.md). */
const ENDPOINT = (import.meta.env.VITE_SQL_ENDPOINT as string | undefined) || '/__sql';
const SERVER = ENDPOINT === '/__sql' ? 'The dev server' : 'The staging server';

async function post(body: unknown): Promise<Reply> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-iotify-sql': '1' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new DataError(
      ENDPOINT === '/__sql'
        ? 'The dev server is not reachable. Is `pnpm dev` running?'
        : 'The staging server is not reachable.',
      {
        code: 'offline',
      },
    );
  }
  let reply: Reply;
  try {
    reply = (await res.json()) as Reply;
  } catch {
    throw new DataError(
      ENDPOINT === '/__sql'
        ? `The dev server answered ${res.status} without data. Restart \`pnpm dev\`.`
        : `${SERVER} answered ${res.status} without data.`,
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
