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
  // IT-0043: the approved new Grid View. The original Grid-View.html stays in pages/, unchanged.
  grid: 'Vehicle-Grid-View.html',
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
  if (file === OLD_GRID) return 'grid';
  return Object.keys(DESIGN_PAGES).find((k) => DESIGN_PAGES[k] === file);
}

/** IT-0043: the other pages still link to the original Grid View; those links open the new one. */
const OLD_GRID = 'Grid-View.html';
const pageFor = (file: string) => (file === OLD_GRID ? DESIGN_PAGES.grid! : file);

/** screens/pages/ of this folder, served unchanged (tools/vite/product-pages.js). */
const FOLDER = `${import.meta.env.BASE_URL}product-pages/tracking/fleet-transport/gps-vehicle-tracking/`;

/** Window width from which the pages show their desktop layout (their `--bp-desktop`). */
const DESKTOP = 1280;

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
    return h && h.key === menuKey ? pageFor(h.file) : DESIGN_PAGES[menuKey]!;
  });
  // IT-0043: only the Grid View page fills the whole content area (8px on all four sides comes
  // from the page itself) and is laid out at its real width (no shrink-to-fit). Every other page
  // keeps the frame and spacing below exactly as before.
  const fill = menuKey === 'grid';
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ height: 0, left: 0, right: 0, width: 0, scale: 1, up: 0, down: 0 });

  // IT-0029. Fill the window below the header (the shell's content area has no fixed height)
  // and the full width beside the sidebar, without the shell's side padding. The pages switch
  // to their desktop layout from a 1280px-wide window (`@media (min-width: 1280px)`). On their
  // own they see the whole window; here they see only the space beside the IoTIFY sidebar. So
  // when the window is wide enough for the desktop layout but that space is not (e.g. 150%
  // Windows scaling on a 1920×1080 screen = a 1280px window), the page is laid out 1280px wide
  // and shrunk slightly to fit, as it would look on its own.
  useLayoutEffect(() => {
    const measure = () => {
      const el = box.current;
      const parent = el?.parentElement;
      if (!el || !parent) return;
      const s = getComputedStyle(parent);
      const left = parseFloat(s.paddingLeft) || 0;
      const right = parseFloat(s.paddingRight) || 0;
      const space = parent.clientWidth;
      if (fill) {
        // Grid View: cancel the page's gap above the frame and its bottom padding (taken from the
        // page's own computed style, the shared CSS is not changed), then fill to the window
        // bottom: no outer scrollbar, no 16px gap, no scaling.
        const up = parseFloat(s.rowGap) || 0;
        const down = parseFloat(s.paddingBottom) || 0;
        const shift = parseFloat(getComputedStyle(el).marginTop) || 0;
        const top = el.getBoundingClientRect().top - shift - up;
        setFit({ height: Math.max(320, window.innerHeight - top), left, right, width: space, scale: 1, up, down });
        return;
      }
      const top = el.getBoundingClientRect().top;
      const width = window.innerWidth >= DESKTOP && space < DESKTOP ? DESKTOP : space;
      setFit({
        height: Math.max(320, window.innerHeight - top - 16),
        left,
        right,
        width,
        scale: space / width,
        up: 0,
        down: 0,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [ready, fill]);

  // IT-0043 / IT-0040 (owner's explicit decision, recorded in this folder's CLAUDE.md as a §3a
  // deviation for the core owner): Grid View only. Two empty slots in the page header row where the
  // Grid View page puts its own controls: left, after the title and info icon (Status); right, in the
  // header tools between the global search and the bell (Filter, Sort, Grid/List). The shared header
  // component is not changed; the slots are removed when Grid View is left.
  useEffect(() => {
    if (!fill) return;
    const header = box.current?.parentElement?.querySelector(':scope > .ui-ph');
    const lead = header?.querySelector(':scope > .ui-ph__lead');
    const tools = header?.querySelector(':scope > .ui-ph__tools');
    if (!lead || !tools) return;
    const slot = (id: string, css: string) => {
      const el = document.createElement('div');
      el.id = id;
      el.style.cssText = `position:relative;z-index:30;display:flex;align-items:center;flex:none;${css}`;
      return el;
    };
    // Left: the title row's own 8px gap after the info icon.
    const left = slot('vgv-header-slot-left', '');
    lead.appendChild(left);
    // Right: 6px + the tools' 2px gap = 8px to the bell; 8px after the search box (its own margin).
    const right = slot('vgv-header-slot-right', 'margin:0 6px 0 0');
    const search = tools.querySelector(':scope > .ui-hsearch');
    tools.insertBefore(right, search ? search.nextSibling : tools.firstChild);
    return () => {
      left.remove();
      right.remove();
    };
  }, [fill]);

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
      <div
        ref={box}
        style={{
          marginLeft: -fit.left,
          marginRight: -fit.right,
          marginTop: fit.up ? -fit.up : undefined,
          marginBottom: fit.down ? -fit.down : undefined,
          height: ready ? fit.height : 0,
          overflow: 'hidden',
        }}
      >
        <iframe
          ref={frame}
          title={`${title} · EIT Smart Track`}
          src={FOLDER + file}
          style={{
            display: 'block',
            width: fit.width || '100%',
            height: ready ? fit.height / fit.scale : 0,
            border: 0,
            transform: fit.scale < 1 ? `scale(${fit.scale})` : undefined,
            transformOrigin: '0 0',
            visibility: ready ? 'visible' : 'hidden',
          }}
        />
      </div>
    </>
  );
}

/** One screen per menu key, each opening its original page. */
export function designScreen(key: string, title: string) {
  return function DesignScreen({ onNavigate }: ScreenContext) {
    return <DesignPage menuKey={key} title={title} onNavigate={onNavigate} />;
  };
}
