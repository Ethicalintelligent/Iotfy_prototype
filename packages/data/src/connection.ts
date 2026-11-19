// Swappable connections. Chosen by VITE_DATA_MODE (.env.local):
//   neon-dev   laptop: SQL runs in the Vite dev server (/__sql) with DATABASE_URL from .env.local
//   claude-mcp published claude.ai demos: Neon through the page's MCP connector
//   api        the future Java backend (not built yet)
import { neonDevConnection } from './connections/neonDev';
import { claudeMcpConnection } from './connections/claudeMcp';
import { apiConnection } from './connections/api';
import type { Connection, DataMode } from './types';

export function dataMode(): DataMode {
  const m = (import.meta.env.VITE_DATA_MODE as string | undefined) || 'neon-dev';
  return m === 'claude-mcp' || m === 'api' ? m : 'neon-dev';
}

export function createConnection(mode: DataMode = dataMode()): Connection {
  if (mode === 'claude-mcp') return claudeMcpConnection();
  if (mode === 'api') return apiConnection();
  return neonDevConnection();
}
