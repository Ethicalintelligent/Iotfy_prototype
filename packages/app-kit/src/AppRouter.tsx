// The router for every app: normal addresses (/apps) when served, #/apps in a published demo
// (one HTML file on claude.ai, where the page address isn't ours). Set by VITE_ROUTER. If the
// demo page has no web address at all (opened as a file or data: page), navigation stays in
// memory, starting from the #/route it was opened with.
import type { ReactNode } from 'react';
import { BrowserRouter, HashRouter, MemoryRouter } from 'react-router-dom';

export const HASH_ROUTES = import.meta.env.VITE_ROUTER === 'hash';

export function AppRouter({ children }: { children: ReactNode }) {
  if (!HASH_ROUTES) return <BrowserRouter>{children}</BrowserRouter>;
  if (/^https?:$/.test(window.location.protocol)) return <HashRouter>{children}</HashRouter>;
  const start = window.location.hash.replace(/^#/, '') || '/';
  return <MemoryRouter initialEntries={[start]}>{children}</MemoryRouter>;
}
