export type DataMode = 'neon-dev' | 'claude-mcp' | 'api';

export interface Statement {
  sql: string;
  params?: unknown[];
}

export interface Connection {
  mode: DataMode;
  /** One statement; returns its rows. */
  query<R = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<R[]>;
  /** Several statements in one transaction (all or nothing); returns each statement's rows. */
  transaction(statements: Statement[]): Promise<unknown[][]>;
}

/** A failed read or save. `message` is Neon's text, unchanged. */
export class DataError extends Error {
  code?: string;
  detail?: string;
  hint?: string;
  constraint?: string;
  table?: string;
  constructor(
    message: string,
    extra: Partial<Pick<DataError, 'code' | 'detail' | 'hint' | 'constraint' | 'table'>> = {},
  ) {
    super(message);
    this.name = 'DataError';
    Object.assign(this, extra);
  }
}
