// Vercel function for the staging server: the apps' database requests (POST /api/sql).
// Public (no password since IT-0008); only the statement check protects it. See packages/data/server/handler.js.
import { handleSql } from '../packages/data/server/handler.js';

export function POST(request) {
  return handleSql(request, process.env.DATABASE_URL);
}
