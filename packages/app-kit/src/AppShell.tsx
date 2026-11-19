// AppShell: rail (56 px, opens on hover), one thin title row (title, ⓘ, breadcrumb), top-right
// tools (wide search with Ctrl+K, notifications with badge, avatar menu), support banner, page.
// Editing: EditBar reminder and the leave guard (Save / Discard / Stay) for every navigation.
import { useState, type ReactNode } from 'react';
import {
  Dot,
  EmptyState,
  IconButton,
  PageHeader,
  Popover,
  PopoverHeader,
  PopoverItem,
  Rail,
  RailButton,
  SearchPalette,
  SearchTrigger,
  ShellFrame,
  Chip,
  useCtrlK,
  type IconName,
  type RailSection,
  type SearchResult,
} from '@iotify/ui';
import { EditSessionProvider, useLeaveGuard } from './edit';
import './app-kit.css';

export interface ShellNotification {
  id: string;
  title: string;
  subtitle?: string;
  tone?: 'red' | 'amber' | 'blue' | 'green' | 'grey';
  onClick?: () => void;
}

export interface AppShellProps {
  /** Shown beside the logo when the rail opens. */
  brandName: string;
  subtitle?: string;
  logoText?: string;
  logoColor?: string | null;
  logoUrl?: string | null;
  sections: RailSection[];
  active: string;
  onSelect: (key: string) => void;
  /** Extra rail buttons at the bottom. */
  railFooter?: { icon: IconName; label: string; onClick: () => void }[];
  title: ReactNode;
  description?: ReactNode;
  back?: { label: string; onClick: () => void };
  meta?: ReactNode;
  /** The avatar menu (UserMenu from @iotify/auth). */
  userMenu?: ReactNode;
  /** Extra header tools before the avatar. */
  tools?: ReactNode;
  /** Bell menu. Omit to hide the bell. */
  notifications?: ShellNotification[];
  /** Search results beyond the menu pages (assets, products…). */
  search?: (query: string) => SearchResult[];
  /** Shown above the header (support session banner). */
  banner?: ReactNode;
  children: ReactNode;
}

export function AppShell(p: AppShellProps) {
  return (
    <EditSessionProvider>
      <Shell {...p} />
    </EditSessionProvider>
  );
}

function Shell(p: AppShellProps) {
  const guard = useLeaveGuard();
  const [mobile, setMobile] = useState(false);
  const [menu, setMenu] = useState<'search' | 'notif' | null>(null);
  const [q, setQ] = useState('');
  useCtrlK(() => setMenu('search'));
  const go = (key: string) => guard(() => p.onSelect(key));

  const pages: SearchResult[] = p.sections.flatMap((s) =>
    s.items.map((it) => ({
      id: 'page:' + it.key,
      title: it.label,
      subtitle: `Page · ${s.heading}`,
      icon: it.icon,
      onSelect: () => go(it.key),
    })),
  );
  const ql = q.trim().toLowerCase();
  const results = ql
    ? [
        ...pages.filter((r) => `${r.title} ${r.subtitle}`.toLowerCase().includes(ql)),
        ...(p.search?.(ql) ?? []),
      ]
        .map((r) => ({ ...r, onSelect: () => guard(r.onSelect) }))
        .slice(0, 10)
    : [];
  const notes = p.notifications;

  return (
    <ShellFrame
      mobileTitle={p.title}
      onMobileMenu={() => setMobile(true)}
      rail={
        <Rail
          brand={p.brandName}
          subtitle={p.subtitle}
          logoText={p.logoText}
          logoColor={p.logoColor}
          logoUrl={p.logoUrl}
          sections={p.sections}
          active={p.active}
          onSelect={go}
          mobileOpen={mobile}
          onMobileClose={() => setMobile(false)}
          footer={p.railFooter?.map((b) => (
            <RailButton
              key={b.label}
              icon={b.icon}
              label={b.label}
              onClick={() => guard(b.onClick)}
            />
          ))}
        />
      }
    >
      {p.banner}
      <PageHeader
        title={p.title}
        description={p.description}
        back={p.back && { label: p.back.label, onClick: () => guard(p.back!.onClick) }}
        meta={p.meta}
        tools={
          <>
            <SearchTrigger onClick={() => setMenu('search')} />
            {p.tools}
            {notes && (
              <IconButton
                icon="bell"
                label="Notifications"
                badge={notes.length}
                active={menu === 'notif'}
                onClick={() => setMenu(menu === 'notif' ? null : 'notif')}
              />
            )}
            {p.userMenu}
          </>
        }
      />
      {p.children}
      <SearchPalette
        open={menu === 'search'}
        onClose={() => {
          setMenu(null);
          setQ('');
        }}
        query={q}
        onQueryChange={setQ}
        results={results}
      />
      <Popover open={menu === 'notif'} onClose={() => setMenu(null)} label="Notifications">
        <PopoverHeader label="Notifications">
          <Chip>{notes?.length ?? 0}</Chip>
        </PopoverHeader>
        {notes?.length ? (
          notes.map((n) => (
            <PopoverItem
              key={n.id}
              lead={<Dot tone={n.tone ?? 'grey'} />}
              title={n.title}
              subtitle={n.subtitle}
              onClick={() => {
                setMenu(null);
                if (n.onClick) guard(n.onClick);
              }}
            />
          ))
        ) : (
          <EmptyState>You are all caught up.</EmptyState>
        )}
      </Popover>
    </ShellFrame>
  );
}
