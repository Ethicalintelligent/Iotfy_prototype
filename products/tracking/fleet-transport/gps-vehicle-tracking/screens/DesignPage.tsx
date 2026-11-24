// IT-0026: the approved EIT Smart Track pages (16 HTML files from the design preview), shown
// unchanged inside the IoTIFY shell. The files sit as they are in screens/pages/. The IoTIFY sidebar and top header (the same as
// the partner portal's) replace the page's own: once a page has loaded, a small style is added
// to it from here that hides its sidebar, slide-out menu, top bar and phone bottom bar. The
// files themselves are never edited. Copy first, Design System later (the owner's request).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Loading } from '@iotify/ui';
import type { ScreenContext } from '@iotify/app-kit';

/** Menu key → original page file. */
export const DESIGN_PAGES: Record<string, string> = {
  dash: 'Dashboard.html',
  grid: 'Grid-View.html',
  map: 'Map-View.html',
  tracking: 'Tracking.html',
  central: 'Centralized-Tracking.html',
  alerts: 'Alerts.html',
  manage: 'Manage-Vehicle.html',
  reports: 'Reports.html',
  groups: 'Groups.html',
};

/** Original page file → menu key (the eight Manage pages all belong to "manage"). */
function keyOf(file: string): string | undefined {
  if (file.startsWith('Manage-')) return 'manage';
  return Object.keys(DESIGN_PAGES).find((k) => DESIGN_PAGES[k] === file);
}

/** screens/pages/ of this folder, served unchanged (tools/vite/product-pages.js). */
const FOLDER = `${import.meta.env.BASE_URL}product-pages/tracking/fleet-transport/gps-vehicle-tracking/`;

/** Hides the page's own navigation; the IoTIFY shell shows its sidebar and header instead. */
const HIDE_OWN_NAV = `
.td-sidebar,.td-drawer,.td-topbar,.td-bottomnav{display:none!important}
.td-app--rail .td-main,.td-main{margin-left:0!important}
:root,body,.td-app{--topbar-h:0px!important}
`;

/**
 * A link inside a page opened a page of another menu item: the shell switches to that item and
 * the new screen opens the very page the link chose (e.g. a Manage module), not its default.
 */
let handOver: { key: string; file: string } | null = null;

function DesignPage({
  menuKey,
  title,
  onNavigate,
}: {
  menuKey: string;
  title: string;
  onNavigate?: (screen: string) => void;
}) {
  const [file] = useState(() => {
    const h = handOver;
    handOver = null;
    return h && h.key === menuKey ? h.file : DESIGN_PAGES[menuKey]!;
  });
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState<number>();

  // Fill the window below the header (the shell's content area has no fixed height).
  useLayoutEffect(() => {
    const fit = () => {
      const top = frame.current?.getBoundingClientRect().top ?? 0;
      setHeight(Math.max(320, window.innerHeight - top - 16));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [ready]);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const onLoad = () => {
      try {
        const doc = el.contentDocument;
        if (doc && !doc.getElementById('iotify-shell')) {
          const style = doc.createElement('style');
          style.id = 'iotify-shell';
          style.textContent = HIDE_OWN_NAV;
          doc.head.appendChild(style);
        }
        setReady(true);
        const current = el.contentWindow?.location.pathname.split('/').pop() ?? '';
        const key = keyOf(current);
        if (key && key !== menuKey && onNavigate) {
          handOver = { key, file: current };
          onNavigate(key);
        }
      } catch {
        setReady(true);
      }
    };
    el.addEventListener('load', onLoad);
    return () => el.removeEventListener('load', onLoad);
  }, [menuKey, onNavigate]);

  return (
    <>
      {!ready && <Loading>Loading {title}…</Loading>}
      <iframe
        ref={frame}
        title={`${title} · EIT Smart Track`}
        src={FOLDER + file}
        style={{
          display: 'block',
          width: '100%',
          height: ready ? height : 0,
          border: 0,
          borderRadius: 'var(--radius-panel)',
          visibility: ready ? 'visible' : 'hidden',
        }}
      />
    </>
  );
}

/** One screen per menu key, each opening its original page. */
export function designScreen(key: string, title: string) {
  return function DesignScreen({ onNavigate }: ScreenContext) {
    return <DesignPage menuKey={key} title={title} onNavigate={onNavigate} />;
  };
}
