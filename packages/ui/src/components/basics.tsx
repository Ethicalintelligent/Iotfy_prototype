import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { ICONS, type IconName } from '../icons';
import { cx } from '../cx';

// ---------------------------------------------------------------- Icon
export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}
/** Stroke icon from the IoTIFY set. Inherits the text colour. */
export function Icon({ name, size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: 'none' }}
      className={className}
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

// ---------------------------------------------------------------- Stack
export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** 'row' (default) or 'col'. */
  dir?: 'row' | 'col';
  /** Gap in px (default 10). */
  gap?: number;
  wrap?: boolean;
  align?: CSSProperties['alignItems'];
  justify?: CSSProperties['justifyContent'];
}
/** Flex row or column with a gap. The only layout helper products need. */
export function Stack({
  dir = 'row',
  gap = 10,
  wrap = dir === 'row',
  align = dir === 'row' ? 'center' : undefined,
  justify,
  className,
  style,
  ...rest
}: StackProps) {
  return (
    <div
      className={cx('ui-stack', className)}
      style={{
        flexDirection: dir === 'row' ? 'row' : 'column',
        gap,
        flexWrap: wrap ? 'wrap' : 'nowrap',
        alignItems: align,
        justifyContent: justify,
        ...style,
      }}
      {...rest}
    />
  );
}

// ---------------------------------------------------------------- Button
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'md' | 'sm';
  icon?: IconName;
}
export function Button({
  variant = 'default',
  size = 'md',
  icon,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'ui-btn',
        variant !== 'default' && `ui-btn--${variant}`,
        size === 'sm' && 'ui-btn--sm',
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}

/** Red text button, used for "Delete" inside a record in Edit mode. */
export function LinkButtonDanger({
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={cx('ui-linkdanger', className)} {...rest} />;
}

// ---------------------------------------------------------------- IconButton
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  /** Accessible name; also shown as the tooltip. */
  label: string;
  /** Number shown in a red badge (hidden when 0 or missing). */
  badge?: number;
  badgeTone?: 'red' | 'amber';
  active?: boolean;
  outlined?: boolean;
}
export function IconButton({
  icon,
  label,
  badge,
  badgeTone = 'red',
  active,
  outlined,
  type = 'button',
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'ui-iconbtn',
        active && 'ui-iconbtn--active',
        outlined && 'ui-iconbtn--outlined',
        className,
      )}
      {...rest}
    >
      {children ?? <Icon name={icon} />}
      {badge ? (
        <span className={cx('ui-badge', badgeTone === 'amber' && 'ui-badge--amber')}>{badge}</span>
      ) : null}
    </button>
  );
}

// ---------------------------------------------------------------- Hue and IconTile
/** A colour from the --hue-* tokens (status tiles, map markers, timelines, icon tiles). */
export type Hue =
  'slate' | 'green' | 'red' | 'blue' | 'black' | 'orange' | 'teal' | 'grey' | 'purple' | 'amber';

export interface IconTileProps {
  icon: IconName;
  hue?: Hue;
  /** 28, 36 (default) or 44 px. */
  size?: 'sm' | 'md' | 'lg';
  /** `soft`: tinted square, coloured icon (default). `solid`: filled square, white icon. */
  variant?: 'soft' | 'solid';
  className?: string;
}
/** A rounded square with an icon: panel headings, status tiles, list leads. */
export function IconTile({
  icon,
  hue = 'green',
  size = 'md',
  variant = 'soft',
  className,
}: IconTileProps) {
  return (
    <span
      className={cx(
        'ui-itile',
        `ui-hue--${hue}`,
        `ui-itile--${size}`,
        variant === 'solid' && 'ui-itile--solid',
        className,
      )}
      aria-hidden="true"
    >
      <Icon name={icon} size={size === 'lg' ? 22 : size === 'sm' ? 15 : 18} />
    </span>
  );
}

// ---------------------------------------------------------------- Card
export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  /** Grey line under the title (panel headings in the GPS Vehicle Tracking design). */
  subtitle?: ReactNode;
  /** Icon tile before the title. */
  icon?: IconName;
  iconHue?: Hue;
  /** Content shown at the right of the title line (e.g. a "View all" button). */
  actions?: ReactNode;
  /** Inner padding and column layout (default true). Set false for edge-to-edge content. */
  padded?: boolean;
}
export function Card({
  title,
  subtitle,
  icon,
  iconHue,
  actions,
  padded = true,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div className={cx('ui-card', padded && 'ui-card--pad', className)} {...rest}>
      {(title || actions) && (
        <div className={cx('ui-card__head', icon && 'ui-card__head--icon')}>
          {title ? (
            <div className="ui-card__heading">
              {icon && <IconTile icon={icon} hue={iconHue} />}
              <div>
                <b className="ui-card__title">{title}</b>
                {subtitle && <div className="ui-card__subtitle">{subtitle}</div>}
              </div>
            </div>
          ) : (
            <span />
          )}
          {actions && <div className="ui-card__actions">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- Chip
export type ChipTone = 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'warn' | 'bad' | 'info';
export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
}
export function Chip({ tone = 'neutral', className, ...rest }: ChipProps) {
  return (
    <span
      className={cx('ui-chip', tone !== 'neutral' && `ui-chip--${tone}`, className)}
      {...rest}
    />
  );
}

/** Colour a status word the way the legacy app did (Active → green, Draft → amber, Ended → red). */
export function statusTone(status: string | null | undefined): ChipTone {
  const s = status ?? '';
  if (/active|installed|accepted|issued/i.test(s) && !/inactive/i.test(s)) return 'green';
  if (/deferred|draft|pending|stock|trial/i.test(s)) return 'amber';
  if (/inactive|ended|lost|suspended|expired/i.test(s)) return 'red';
  return 'neutral';
}
export function StatusChip({ status }: { status: string | null | undefined }) {
  return <Chip tone={statusTone(status)}>{status || '—'}</Chip>;
}

/** ✓ Yes / ✗ No in green or red. */
export function YesNo({
  value,
  yes = 'Yes',
  no = 'No',
}: {
  value: boolean;
  yes?: string;
  no?: string;
}) {
  return <span className={value ? 'ui-yes' : 'ui-no'}>{value ? `✓ ${yes}` : `✗ ${no}`}</span>;
}

// ---------------------------------------------------------------- Avatar
export interface AvatarProps {
  name: string;
  tone?: 'violet' | 'blue' | 'green' | 'amber';
  size?: number;
  /** Colour of the small status dot (e.g. Neon connection), as a CSS colour or token. */
  status?: string;
}
export const initials = (name: string) =>
  String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
export function Avatar({ name, tone = 'green', size = 30, status }: AvatarProps) {
  return (
    <span
      className={`ui-avatar ui-avatar--${tone}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.37) }}
      title={name}
    >
      {initials(name)}
      {status && <span className="ui-avatar__dot" style={{ background: status }} />}
    </span>
  );
}

/** Small coloured dot for notification lists and statuses. */
export function Dot({ tone = 'grey' }: { tone?: 'red' | 'amber' | 'blue' | 'green' | 'grey' }) {
  return <span className={`ui-dot ui-dot--${tone}`} />;
}

// ---------------------------------------------------------------- Note
export function Note({
  tone = 'amber',
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { tone?: 'amber' | 'green' | 'grey' | 'red' }) {
  return (
    <div className={cx('ui-note', tone !== 'amber' && `ui-note--${tone}`, className)} {...rest} />
  );
}

// ---------------------------------------------------------------- Tabs
export interface TabsProps<K extends string> {
  tabs: { key: K; label: ReactNode }[];
  value: K;
  onChange: (key: K) => void;
  label?: string;
}
export function Tabs<K extends string>({ tabs, value, onChange, label }: TabsProps<K>) {
  return (
    <div className="ui-tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={t.key === value}
          className={cx('ui-tab', t.key === value && 'ui-tab--on')}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- EmptyState / Loading
export interface EmptyStateProps {
  title?: ReactNode;
  children?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
}
export function EmptyState({ title, children, icon, action }: EmptyStateProps) {
  return (
    <div className="ui-empty">
      {icon && <Icon name={icon} size={24} />}
      {title && <b className="ui-empty__title">{title}</b>}
      {children && <span>{children}</span>}
      {action}
    </div>
  );
}
export function Loading({ children = 'Loading…' }: { children?: ReactNode }) {
  return (
    <div className="ui-loading" role="status">
      <span className="ui-spin" />
      {children}
    </div>
  );
}
