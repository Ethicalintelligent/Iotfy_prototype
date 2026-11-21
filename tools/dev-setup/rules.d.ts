export interface SetupNames {
  name: string;
  dev: string;
  database: string;
}
export interface Who {
  role?: string;
  branch?: string;
}
export function normalizeName(raw: unknown): string | null;
export function setupNames(raw: unknown): SetupNames | null;
export function checkPush(who: Who, refs: string[]): string | null;
export function checkCommit(who: Who, current: string): string | null;
