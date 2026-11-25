// Grid View page frame: fills the IoTIFY shell's content area exactly (as the approved design fills
// its window), so only the card grid scrolls. Carries the style scope (`.st-grid`) and `data-st`
// (screens/smart-track/shell-fit.css).
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** The design's plain page text (the shell's body sets other defaults). */
export const PAGE_TEXT = {
  lineHeight: 'normal',
  fontSize: 16,
  fontWeight: 400,
  fontVariantNumeric: 'normal',
} as const;

interface Fit {
  left: number;
  right: number;
  top: number;
  bottom: number;
  height: number;
}

export function PageFrame({ scope, children }: { scope: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit>({ left: 0, right: 0, top: 0, bottom: 0, height: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      const el = box.current;
      const parent = el?.parentElement;
      if (!el || !parent) return;
      const s = getComputedStyle(parent);
      // The frame follows the shell's page header: it takes the space of the gap below the header.
      const top = parseFloat(s.rowGap) || 0;
      const bottom = parseFloat(s.paddingBottom) || 0;
      // It ends at the window's bottom.
      const shifted = parseFloat(el.style.marginTop) || 0; // the frame's own negative margin, once applied
      const start = el.getBoundingClientRect().top + window.scrollY - top - shifted;
      setFit({
        left: parseFloat(s.paddingLeft) || 0,
        right: parseFloat(s.paddingRight) || 0,
        top,
        bottom,
        height: Math.max(320, window.innerHeight - start),
      });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return (
    <div
      ref={box}
      style={{
        marginLeft: -fit.left,
        marginRight: -fit.right,
        marginTop: -fit.top,
        marginBottom: -fit.bottom,
      }}
    >
      <div className={scope} data-st="" style={{ height: fit.height || undefined, ...PAGE_TEXT }}>
        {children}
      </div>
    </div>
  );
}
