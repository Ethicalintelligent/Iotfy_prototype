// Sign-in, roles, branding and support-session rules. Pure functions, ported from the legacy app
// (legacy/src/app.js: sessionFor ~520, loginUsers ~527, the login form ~1946, support ~1407–1435,
// actions ~1824–1850). No React here; see AuthProvider for the app side.
import type {
  CompaniesRow,
  DealersRow,
  NodesRow,
  RolesRow,
  SupportSessionsRow,
  UsersRow,
} from '@iotify/data';

export type AppKind = 'admin' | 'partner' | 'customer';
/** What a signed-in person is in the app. */
export type Role = 'platform' | 'dealer' | 'company' | 'fleet';

export const APPS: Record<AppKind, { name: string; roles: Role[] }> = {
  admin: { name: 'IoTIFY Admin Console', roles: ['platform'] },
  partner: { name: 'IoTIFY Partner Portal', roles: ['dealer'] },
  customer: { name: 'IoTIFY Customer Apps', roles: ['company', 'fleet'] },
};
export const ROLE_NAMES: Record<Role, string> = {
  platform: 'Platform Admin',
  dealer: 'Dealer Admin',
  company: 'Company Admin',
  fleet: 'Fleet Manager',
};
export const ROLE_TONE: Record<Role, 'violet' | 'blue' | 'green' | 'amber'> = {
  platform: 'violet',
  dealer: 'blue',
  company: 'green',
  fleet: 'amber',
};
export const appForRole = (role: Role): AppKind =>
  role === 'platform' ? 'admin' : role === 'dealer' ? 'partner' : 'customer';

/** Support links are valid for 2 hours from the start of the session. */
export const SUPPORT_MAX_MS = 2 * 60 * 60 * 1000;
/** Customers and dealers allow support for 7 days at a time. */
export const SUPPORT_GRANT_DAYS = 7;

/** Demo sign-in email: the user's email, or name.slug@iotify.demo. */
export const userEmail = (u: Pick<UsersRow, 'email' | 'name'>) =>
  u.email ||
  `${String(u.name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')}@iotify.demo`;

/** The role and account a user signs in as. Fleet roles are their own account (their assets). */
export function sessionFor(u: UsersRow, roles: RolesRow[]): { role: Role; account: string } {
  const roleName = roles.find((r) => r.id === u.role_id)?.name ?? '';
  if (u.level === 'Platform') return { role: 'platform', account: 'PLATFORM' };
  if (u.level === 'Dealer') return { role: 'dealer', account: u.account_id ?? '' };
  if (roleName === 'Fleet Manager' || roleName === 'Fleet Supervisor')
    return { role: 'fleet', account: u.id };
  return { role: 'company', account: u.account_id ?? '' };
}
/** The company a company or fleet user belongs to. */
export const companyOfUser = (u: UsersRow | undefined) =>
  u?.level === 'Company' ? (u.account_id ?? '') : '';

export const isWhiteLabel = (d: DealersRow | undefined | null) =>
  d?.reseller_type === 'White-label reseller';

export interface Brand {
  name: string;
  /** Up to 3 letters for the logo square. */
  initials: string;
  color: string | null;
  logoUrl: string | null;
  whiteLabel: boolean;
  dealerId: string | null;
}
export const EIT_BRAND: Brand = {
  name: 'EIT',
  initials: 'EIT',
  color: null,
  logoUrl: null,
  whiteLabel: false,
  dealerId: null,
};
const initialsOf = (s: string) =>
  s
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || 'EIT';
/** The brand customers see: a white-label dealer's own brand, otherwise EIT. */
export function brandOf(d: DealersRow | undefined | null): Brand {
  if (!d || !isWhiteLabel(d)) return EIT_BRAND;
  const name = d.brand_name || d.name || 'EIT';
  return {
    name,
    initials: initialsOf(name),
    color: d.brand_color || '#2B6CB0',
    logoUrl: d.brand_logo || null,
    whiteLabel: true,
    dealerId: d.id,
  };
}

/** Where the person signs in: the app, and in customer apps optionally a product and/or dealer page. */
export interface Entry {
  app: AppKind;
  /** A product's own sign-in page. */
  product?: string | null;
  /** A white-label dealer's branded sign-in page (only that dealer's customers). */
  dealer?: string | null;
}

export interface Directory {
  users: UsersRow[];
  roles: RolesRow[];
  companies: CompaniesRow[];
  dealers: DealersRow[];
  nodes: NodesRow[];
  /** Apps a company can open (from @iotify/core companyApps). */
  companyApps: (companyId: string) => Set<string>;
}

/** The dealer of a branded page, only when it's a white-label reseller. */
const brandDealer = (dir: Directory, entry: Entry) => {
  const d = dir.dealers.find((x) => x.id === entry.dealer);
  return isWhiteLabel(d) ? d : undefined;
};

/** Demo accounts offered on a sign-in page. */
export function loginUsers(dir: Directory, entry: Entry): UsersRow[] {
  const allowed = APPS[entry.app].roles;
  const bd = brandDealer(dir, entry);
  return dir.users.filter((u) => {
    const { role, account } = sessionFor(u, dir.roles);
    if (!allowed.includes(role)) return false;
    if (role === 'dealer' && !dir.dealers.some((d) => d.id === account)) return false;
    if (
      (role === 'company' || role === 'fleet') &&
      !dir.companies.some((c) => c.id === u.account_id)
    )
      return false;
    if (entry.product && !dir.companyApps(u.account_id ?? '').has(entry.product)) return false;
    if (
      entry.product &&
      bd &&
      dir.companies.find((c) => c.id === u.account_id)?.dealer_id !== bd.id
    )
      return false;
    return true;
  });
}

export type SignInResult = { ok: true; user: UsersRow } | { ok: false; error: string };

/** Checks a sign-in. Demo: any password works, but one must be typed. Errors say where to go instead. */
export function checkSignIn(
  dir: Directory,
  entry: Entry,
  email: string,
  password: string,
): SignInResult {
  const em = email.trim().toLowerCase();
  if (!em || !password) return { ok: false, error: 'Enter your email and password.' };
  const user = loginUsers(dir, entry).find((u) => userEmail(u).toLowerCase() === em);
  if (user) return { ok: true, user };
  const any = dir.users.find((u) => userEmail(u).toLowerCase() === em);
  if (!any)
    return { ok: false, error: 'No account found for that email. Pick a demo account below.' };
  const { role } = sessionFor(any, dir.roles);
  if (!APPS[entry.app].roles.includes(role))
    return {
      ok: false,
      error: `${any.name} signs in to the ${APPS[appForRole(role)].name}, not here.`,
    };
  if (entry.product) {
    const productName = dir.nodes.find((n) => n.id === entry.product)?.name ?? entry.product;
    const companyName = dir.companies.find((c) => c.id === any.account_id)?.name ?? any.account_id;
    return {
      ok: false,
      error: `${companyName} has no active ${productName} subscription. Sign in to the app your company bought, or ask your dealer.`,
    };
  }
  return { ok: false, error: 'No account found for that email. Pick a demo account below.' };
}

// ------------------------------------------------------------------ support sessions

/** yyyy-mm-dd of a date (local calendar day). */
export const isoDay = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
export const addDays = (d: Date, n: number) => isoDay(new Date(d.getTime() + n * 86400000));

/** Support is allowed while support_access_until is today or later. */
export const supportAllowed = (
  rec: { support_access_until?: string | null } | undefined,
  today: Date = new Date(),
) => !!rec?.support_access_until && String(rec.support_access_until).slice(0, 10) >= isoDay(today);

/** Next support session id: SS1, SS2… */
export function nextSupportId(rows: Pick<SupportSessionsRow, 'id'>[]) {
  const max = rows.reduce((m, r) => Math.max(m, Number(/^SS(\d+)$/i.exec(r.id)?.[1] ?? 0)), 0);
  return `SS${max + 1}`;
}

/** Which app a support session opens in. */
export const supportApp = (s: Pick<SupportSessionsRow, 'target_level'>): AppKind =>
  s.target_level === 'Company' ? 'customer' : 'partner';

export const SUPPORT_LINK_INVALID = 'This support link is not valid any more. Start a new session.';
export const SUPPORT_ENDED = 'Support session ended and logged. You can close this tab.';
export const SUPPORT_VIEW_ONLY = 'Support sessions are view-only. Nothing was changed.';

/** A support link works while its session is open, less than 2 hours old, and in the right app. */
export function supportLinkValid(
  s: SupportSessionsRow | undefined,
  app: AppKind,
  now: Date = new Date(),
): boolean {
  if (!s || s.ended_at) return false;
  const started = Date.parse(String(s.started_at ?? ''));
  if (
    !Number.isFinite(started) ||
    now.getTime() - started >= SUPPORT_MAX_MS ||
    started - now.getTime() > 60000
  )
    return false;
  return supportApp(s) === app;
}
