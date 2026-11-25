// IT-0036. Each menu item's screen lives in its own folder (screens/<menu key>/Screen.tsx) and
// is loaded only when opened, so each page's stylesheet (screens/<key>/<key>.css) loads with it.
// The HTML originals were removed after conversion (IT-0037); they are in git history.
import { lazy, Suspense, type ComponentType } from 'react';
import { Loading } from '@iotify/ui';
import type { ScreenContext } from '@iotify/app-kit';

const LOADERS: Record<string, () => Promise<{ default: ComponentType<ScreenContext> }>> = {
  dash: () => import('./dash/Screen'),
  grid: () => import('./grid/Screen'),
  map: () => import('./map/Screen'),
  tracking: () => import('./tracking/Screen'),
  central: () => import('./central/Screen'),
  alerts: () => import('./alerts/Screen'),
  manage: () => import('./manage/Screen'),
  reports: () => import('./reports/Screen'),
  groups: () => import('./groups/Screen'),
  tickets: () => import('./tickets/Screen'),
};

const cache: Record<string, ComponentType<ScreenContext>> = {};

/** The screen component for a menu key. */
export function screenOf(key: string): ComponentType<ScreenContext> {
  if (cache[key]) return cache[key]!;
  const Lazy = lazy(LOADERS[key]!);
  const Screen = (ctx: ScreenContext) => (
    <Suspense fallback={<Loading>Loading…</Loading>}>
      <Lazy {...ctx} />
    </Suspense>
  );
  return (cache[key] = Screen);
}
