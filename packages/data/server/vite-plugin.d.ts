import type { Plugin } from 'vite';

/** Dev-server endpoint /__sql for the neon-dev connection. */
export function neonDevSql(options?: { databaseKey?: string }): Plugin;
