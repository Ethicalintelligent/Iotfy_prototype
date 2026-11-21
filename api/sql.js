// Vercel function for the staging server: the apps' database requests (POST /api/sql).
// Behind the staging password (middleware.js). See packages/data/server/handler.js.
import { handleSql } from '../packages/data/server/handler.js';

export function POST(request) {
  return handleSql(request, process.env.DATABASE_URL);
}
