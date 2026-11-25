import type { UserConfig } from 'vite';

export const TEST: boolean;
export const PORTS: { admin: number; partner: number; customer: number; neondb: number };
export function appConfig(app: 'admin' | 'partner' | 'customer' | 'neondb'): UserConfig;
