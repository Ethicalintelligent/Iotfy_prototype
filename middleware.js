// Vercel Routing Middleware (staging server): every request needs the staging password first.
// See tools/staging/password.js and docs/STAGING.md.
import { next } from '@vercel/functions';
import { passwordGate } from './tools/staging/password.js';

export default function middleware(request) {
  return passwordGate(request, process.env.STAGING_PASSWORD) ?? next();
}
