// Breadcrumbs on detail pages (legacy parity): a page showing one record calls
// useDetailTitle(name), and the shell's title row becomes "← Companies › Sample Company A".
// The back link returns to the list (through the leave guard, like any navigation).
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Setter = (title: string | null) => void;
const Ctx = createContext<{ title: string | null; set: Setter } | null>(null);

export function DetailTitleProvider({ children }: { children: ReactNode }) {
  const [title, set] = useState<string | null>(null);
  return <Ctx.Provider value={{ title, set }}>{children}</Ctx.Provider>;
}

/** The record name shown in the title row while this page is open; null for a list. */
export function useDetailTitle(title: string | null | undefined) {
  const set = useContext(Ctx)?.set;
  useEffect(() => {
    if (!set) return;
    set(title || null);
    return () => set(null);
  }, [set, title]);
}

/** For the shell: the current record name, if a detail page set one. */
export const useCurrentDetailTitle = () => useContext(Ctx)?.title ?? null;
