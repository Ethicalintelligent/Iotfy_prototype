// Sign-in and app-picker pieces: the split sign-in layout, demo account buttons, app tiles,
// the brand logo square and the support banner. Ported from legacy template.html (#login,
// .hero, .lform, .demoacct, .apptile, .logo, .supbar).
import type React from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';
import type { IconName } from '../icons';
import { Avatar, Icon } from './basics';

// ---------------------------------------------------------------- BrandLogo
export interface BrandLogoProps {
  /** Up to 3 letters (shown when there's no image). */
  text: string;
  /** Background colour for a white-label brand; default is the EIT gradient. */
  color?: string | null;
  /** Logo image (white-label). */
  imageUrl?: string | null;
  size?: number;
}
/** The rounded logo square: EIT gradient, a dealer's colour, or a dealer's logo image. */
export function BrandLogo({ text, color, imageUrl, size = 38 }: BrandLogoProps) {
  return (
    <span
      className="ui-brandlogo"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.32),
        ...(imageUrl
          ? {
              background: `var(--white) url("${imageUrl}") center / contain no-repeat`,
              color: 'transparent',
            }
          : color
            ? { background: color }
            : {}),
      }}
    >
      {imageUrl ? '.' : text.slice(0, 3)}
    </span>
  );
}

// ---------------------------------------------------------------- SignInLayout
export interface SignInLayoutProps {
  /** Logo and name at the top of the dark panel. */
  brand: ReactNode;
  /** Big heading; wrap the highlighted part in <span>. */
  heading?: ReactNode;
  intro?: ReactNode;
  /** Feature list or anything else under the intro (e.g. product sign-in links). */
  children?: ReactNode;
  /** Small print at the bottom of the dark panel. */
  footer?: ReactNode;
  /** The sign-in form (right side). */
  form: ReactNode;
  /** Card header over the form (GPS Platform approved design: icon tile + title + subtitle). */
  formTitle?: ReactNode;
  formSubtitle?: ReactNode;
  /** Icon in the header tile; default `lock`. */
  formIcon?: IconName;
}
/**
 * Two-panel sign-in page: dark brand panel on the left; on the right the form sits in a white card
 * with an icon-tile header, as in the approved GPS Platform screens. One column on phones.
 */
export function SignInLayout({
  brand,
  heading,
  intro,
  children,
  footer,
  form,
  formTitle,
  formSubtitle,
  formIcon = 'lock',
}: SignInLayoutProps) {
  return (
    <section className="ui-signin">
      <div className="ui-signin__hero">
        <div className="ui-signin__brand">{brand}</div>
        {heading && <h1 className="ui-signin__heading">{heading}</h1>}
        {intro && <p className="ui-signin__intro">{intro}</p>}
        {children}
        {footer && <p className="ui-signin__foot">{footer}</p>}
      </div>
      <div className="ui-signin__side">
        <div className="ui-signin__card">
          {formTitle && (
            <header className="ui-signin__cardhead">
              <span className="ui-signin__cardic">
                <Icon name={formIcon} size={20} />
              </span>
              <span>
                <h2>{formTitle}</h2>
                {formSubtitle && <p>{formSubtitle}</p>}
              </span>
            </header>
          )}
          <div className="ui-signin__form">{form}</div>
        </div>
      </div>
    </section>
  );
}

/** Items on the dark panel: bold title + text. */
export function HeroList({ items }: { items: { title: string; text: string }[] }) {
  return (
    <ul className="ui-herolist">
      {items.map((i) => (
        <li key={i.title}>
          <b>{i.title}</b>
          {i.text}
        </li>
      ))}
    </ul>
  );
}

/** Small pills on the dark panel (a product's features under its sign-in scene). */
export function HeroChips({ items, label }: { items: string[]; label?: string }) {
  if (!items.length) return null;
  return (
    <ul className="ui-herochips" aria-label={label}>
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

/** A line with text in the middle ("— Demo accounts —"). */
export function DividerText({ children }: { children: ReactNode }) {
  return <div className="ui-divtxt">{children}</div>;
}

// ---------------------------------------------------------------- DemoAccountButton
export interface DemoAccountButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  name: string;
  /** Role and account, e.g. "Company Admin · Sample Company A". */
  detail: string;
  tone?: 'violet' | 'blue' | 'green' | 'amber';
}
/** A demo account card on a sign-in page. Clicking fills the form. */
export function DemoAccountButton({
  name,
  detail,
  tone = 'green',
  className,
  type = 'button',
  ...rest
}: DemoAccountButtonProps) {
  return (
    <button type={type} className={cx('ui-demoacct', className)} {...rest}>
      <Avatar name={name} tone={tone} size={30} />
      <span>
        <b>{name}</b>
        <small>{detail}</small>
      </span>
    </button>
  );
}
/** Two-column grid of demo accounts. */
export function DemoAccountGrid({ children }: { children: ReactNode }) {
  return <div className="ui-demogrid">{children}</div>;
}
/** Demo accounts under a heading (their company or dealer). Put several in DemoAccountGroups. */
export function DemoAccountGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="ui-demogroup">
      <h4>{title}</h4>
      <div className="ui-demogrid">{children}</div>
    </div>
  );
}
/** Scrolling list of DemoAccountGroup sections (long demo account lists). */
export function DemoAccountGroups({ children }: { children: ReactNode }) {
  return <div className="ui-demogroups">{children}</div>;
}

// ---------------------------------------------------------------- AppTile
export interface AppTileProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  name: string;
  /** Second line, e.g. "Base" or "Package · 3 products". */
  kind?: ReactNode;
  /** Third line, e.g. "12 assets". */
  meta?: ReactNode;
  /** Compact one-line tile. */
  compact?: boolean;
}
/** An app on "My apps" (and the not-in-your-apps page). */
export function AppTile({
  name,
  kind,
  meta,
  compact,
  className,
  type = 'button',
  ...rest
}: AppTileProps) {
  const ini = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return (
    <button
      type={type}
      className={cx('ui-apptile', compact && 'ui-apptile--sm', className)}
      {...rest}
    >
      <span className="ui-apptile__ic">{ini}</span>
      <b>{name}</b>
      {!compact && kind && <small>{kind}</small>}
      {!compact && meta && <span className="ui-muted ui-apptile__meta">{meta}</span>}
      <span className="ui-apptile__go">Open →</span>
    </button>
  );
}
/** Responsive grid of app tiles. */
export function AppGrid({ children }: { children: ReactNode }) {
  return <div className="ui-appgrid">{children}</div>;
}

// ---------------------------------------------------------------- SupportBar
/** The amber banner shown during a support session (view-only). */
export function SupportBar({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="ui-supbar" role="status">
      <Icon name="help" size={16} />
      <span>{children}</span>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------- EntryLinks
export interface EntryLinkGroup {
  heading: string;
  links: {
    href: string;
    label: string;
    detail?: string;
    onClick?: (e: React.MouseEvent) => void;
  }[];
}
/** Groups of links on the dark sign-in panel (e.g. every product's own sign-in page). */
export function EntryLinks({
  title,
  intro,
  groups,
}: {
  title: string;
  intro?: string;
  groups: EntryLinkGroup[];
}) {
  return (
    <div className="ui-eps">
      <div className="ui-eps__head">
        <b>{title}</b>
        {intro && <small>{intro}</small>}
      </div>
      <div className="ui-eps__body">
        {groups.map((g) => (
          <div key={g.heading} className="ui-eps__group">
            <span>{g.heading}</span>
            {g.links.map((l) => (
              <a key={l.href} className="ui-ep" href={l.href} onClick={l.onClick}>
                {l.label}
                {l.detail && <small>{l.detail}</small>}
              </a>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
