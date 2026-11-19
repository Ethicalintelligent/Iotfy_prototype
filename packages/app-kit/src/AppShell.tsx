// AppShell (first version, Step 5): rail, one-line page header with the top-right tools,
// support banner, page content. Step 6 adds search, notifications, Edit/Save and the leave guard.
import { useState, type ReactNode } from 'react';
import {
  PageHeader,
  Rail,
  RailButton,
  ShellFrame,
  type IconName,
  type RailSection,
} from '@iotify/ui';

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
  /** Top-right header tools (user menu…). */
  tools?: ReactNode;
  /** Shown above the header (support session banner). */
  banner?: ReactNode;
  children: ReactNode;
}

export function AppShell(p: AppShellProps) {
  const [mobile, setMobile] = useState(false);
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
          onSelect={p.onSelect}
          mobileOpen={mobile}
          onMobileClose={() => setMobile(false)}
          footer={p.railFooter?.map((b) => (
            <RailButton key={b.label} icon={b.icon} label={b.label} onClick={b.onClick} />
          ))}
        />
      }
    >
      {p.banner}
      <PageHeader
        title={p.title}
        description={p.description}
        back={p.back}
        meta={p.meta}
        tools={p.tools}
      />
      {p.children}
    </ShellFrame>
  );
}
