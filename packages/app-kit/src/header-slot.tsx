// IT-0037. Page controls in the shell header, only for a page whose approved design puts them
// there (first use: GPS Vehicle Tracking › Grid View, the admin's explicit request). The shell
// renders two empty, invisible slots in its title row: `left` after the title and ⓘ, `right`
// between search and the bell. A page fills them with <HeaderSlot side="…">. When no page uses
// them they take no space, so every other page and application looks exactly as before.
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export const HEADER_SLOT_ID = {
  left: 'ui-header-slot-left',
  right: 'ui-header-slot-right',
} as const;

/** The empty slot element the shell places in its header (display: contents: no box, no gap). */
export function HeaderSlotTarget({ side }: { side: keyof typeof HEADER_SLOT_ID }) {
  return <span id={HEADER_SLOT_ID[side]} style={{ display: 'contents' }} />;
}

/** Renders `children` into the shell header's left or right page-control slot. */
export function HeaderSlot({
  side,
  children,
}: {
  side: keyof typeof HEADER_SLOT_ID;
  children: ReactNode;
}) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setEl(document.getElementById(HEADER_SLOT_ID[side]));
  }, [side]);
  return el ? createPortal(children, el) : null;
}
