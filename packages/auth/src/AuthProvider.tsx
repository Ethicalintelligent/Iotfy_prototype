// One session per app. Remembers who is signed in (this browser only) and the sign-in page they
// came in through, so signing out returns there. During a support session everything inside is
// view-only (saves are refused by @iotify/data).
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReadOnlyData,
  useBundleRules,
  useProductAssetTypes,
  useAppUser,
  useCompany,
  useDealers,
  useNodes,
  useRoles,
  useSaveRecord,
  useUpdateRecord,
  useSubscriptions,
  useSupportSessions,
  useReloadData,
  useMarkOnce,
  type DealersRow,
  type SupportSessionsRow,
  type AppUserRow,
} from '@iotify/data';
import { createRules, type Rules } from '@iotify/core';
import {
  APPS,
  EIT_BRAND,
  SUPPORT_ENDED,
  SUPPORT_GRANT_DAYS,
  SUPPORT_LINK_INVALID,
  SUPPORT_LINK_USED,
  SUPPORT_VIEW_ONLY,
  addDays,
  brandOf,
  checkSignIn,
  companyById,
  companyOfUser,
  dealerSuspended,
  isWhiteLabel,
  loginUsers,
  nextSupportId,
  sessionFor,
  supportApp,
  supportLinkValid,
  type AppKind,
  type Brand,
  type Directory,
  type Entry,
  type Role,
} from './logic';

interface Stored {
  userId: string;
  /** Path of the sign-in page used (/, /app/N052, /d/DL2/app/N003). */
  home: string;
  /** "Keep me signed in": kept after the browser closes. Otherwise only until the tab closes. */
  remember?: boolean;
}
const storeKey = (app: AppKind) => `iotify.session.${app}`;
const supportKey = (app: AppKind) => `iotify.support.${app}`;
function read<T>(storage: () => Storage, key: string): T | null {
  try {
    const v = storage().getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function write(storage: () => Storage, key: string, v: unknown) {
  try {
    if (v == null) storage().removeItem(key);
    else storage().setItem(key, JSON.stringify(v));
  } catch {
    /* private mode: the session lasts until the page closes */
  }
}

/** A page in another app: its base address plus the route (#/route in published demos). */
export function appLink(app: AppKind, route: string): string {
  return `${appUrls()[app] ?? ''}${import.meta.env.VITE_ROUTER === 'hash' ? '#' : ''}${route}`;
}

/** Where the other apps run (for cross-app support links). */
export function appUrls(): Record<AppKind, string> {
  try {
    return JSON.parse(String(import.meta.env.VITE_APP_URLS ?? '{}'));
  } catch {
    return { admin: '', partner: '', customer: '' };
  }
}

export interface SupportState {
  session: SupportSessionsRow;
  /** The EIT or dealer person giving support. */
  actor: AppUserRow | undefined;
}

export interface AuthValue {
  app: AppKind;
  appName: string;
  /** Still reading users, companies… from Neon. */
  loading: boolean;
  error: Error | null;
  directory: Directory | null;
  rules: Rules | null;
  /** The signed-in person (during support: the person giving support). */
  user: AppUserRow | null;
  role: Role | null;
  /** PLATFORM, a dealer id, a company id, or (fleet) the user's own id. */
  account: string | null;
  /** The company of a company or fleet session. */
  companyId: string | null;
  /** The dealer whose brand and customers apply. */
  dealerId: string | null;
  brand: Brand;
  /** The sign-in page this session started from. */
  home: string;
  /** A message for the sign-in page (support ended, link invalid…). */
  notice: string | null;
  setNotice: (n: string | null) => void;
  signIn: (
    email: string,
    password: string,
    entry: Entry,
    homePath: string,
    remember?: boolean,
  ) => string | null;
  signOut: () => void;
  /** Demo only: become another account of this app. */
  switchUser: (userId: string) => void;
  loginUsers: (entry: Entry) => AppUserRow[];
  /** Brand for a sign-in page (a white-label dealer's page, or EIT). */
  brandFor: (dealerId: string | null | undefined) => Brand;
  support: SupportState | null;
  /** Logs a new support session and returns its one-time link. */
  startSupport: (q: {
    level: 'Company' | 'Dealer';
    account: string;
    product?: string | null;
    reason: string;
  }) => Promise<{ id: string; url: string }>;
  /** Opens a support link in this app. false when it's no longer valid. */
  openSupport: (sessionId: string) => Promise<boolean>;
  endSupport: () => Promise<void>;
  /** Customer or dealer allows support for 7 days, or turns it off. */
  setSupportAccess: (level: 'Company' | 'Dealer', account: string, on: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('Wrap the app in <AuthProvider> from @iotify/auth.');
  return v;
}

export function AuthProvider({ app, children }: { app: AppKind; children: ReactNode }) {
  const navigate = useNavigate();
  const users = useAppUser();
  const roles = useRoles();
  const companies = useCompany();
  const dealers = useDealers();
  const nodes = useNodes();
  const bundleRules = useBundleRules();
  const subscriptions = useSubscriptions();
  const productAssetTypes = useProductAssetTypes();
  const supportSessions = useSupportSessions();
  const save = useSaveRecord();
  const update = useUpdateRecord();
  const reload = useReloadData();
  const markOnce = useMarkOnce();
  const queries = [
    users,
    roles,
    companies,
    dealers,
    nodes,
    bundleRules,
    subscriptions,
    productAssetTypes,
    supportSessions,
  ];
  const loading = queries.some((q) => q.isLoading);
  const error = (queries.find((q) => q.error)?.error as Error | undefined) ?? null;

  const [stored, setStored] = useState<Stored | null>(
    () =>
      read<Stored>(() => localStorage, storeKey(app)) ??
      read<Stored>(() => sessionStorage, storeKey(app)),
  );
  const [supportId, setSupportId] = useState<string | null>(() =>
    read<string>(() => sessionStorage, supportKey(app)),
  );
  const [notice, setNotice] = useState<string | null>(null);

  const rules = useMemo(
    () =>
      nodes.data && bundleRules.data && subscriptions.data && productAssetTypes.data
        ? createRules({
            nodes: nodes.data,
            bundle_rules: bundleRules.data,
            subscriptions: subscriptions.data,
            // apps' asset types (My apps counts, product app asset lists)
            product_asset_types: productAssetTypes.data,
          })
        : null,
    [nodes.data, bundleRules.data, subscriptions.data, productAssetTypes.data],
  );
  const directory = useMemo<Directory | null>(
    () =>
      users.data && roles.data && companies.data && dealers.data && nodes.data && rules
        ? {
            users: users.data,
            roles: roles.data,
            companies: companies.data,
            dealers: dealers.data,
            nodes: nodes.data,
            companyApps: rules.companyApps,
          }
        : null,
    [users.data, roles.data, companies.data, dealers.data, nodes.data, rules],
  );

  const persist = useCallback(
    (s: Stored | null) => {
      setStored(s);
      const keep = s?.remember !== false;
      write(() => localStorage, storeKey(app), keep ? s : null);
      write(() => sessionStorage, storeKey(app), keep ? null : s);
    },
    [app],
  );
  const persistSupport = useCallback(
    (id: string | null) => {
      setSupportId(id);
      write(() => sessionStorage, supportKey(app), id);
    },
    [app],
  );

  // ---- who is signed in
  const supportRow = supportId ? supportSessions.data?.find((s) => s.id === supportId) : undefined;
  const support: SupportState | null = useMemo(
    () =>
      supportRow && !supportRow.ended_at && supportApp(supportRow) === app
        ? { session: supportRow, actor: users.data?.find((u) => u.id === supportRow.actor_user_id) }
        : null,
    [supportRow, app, users.data],
  );

  let user: AppUserRow | null = null;
  let role: Role | null = null;
  let account: string | null = null;
  if (support) {
    user = support.actor ?? null;
    role = support.session.target_level === 'Company' ? 'company' : 'dealer';
    account = support.session.target_account_id;
  } else if (stored && directory) {
    const u = directory.users.find((x) => String(x.id) === String(stored.userId));
    if (u) {
      const s = sessionFor(u, directory.roles);
      // Each app lets in only its own roles; a suspended dealer's people are signed out.
      const blocked =
        s.role === 'dealer' && dealerSuspended(directory.dealers.find((d) => d.id === s.account));
      if (APPS[app].roles.includes(s.role) && !blocked) {
        user = u;
        role = s.role;
        account = s.account;
      }
    }
  }
  const companyId =
    role === 'company' ? account : role === 'fleet' ? companyOfUser(user ?? undefined) : null;
  const dealerId =
    role === 'dealer'
      ? account
      : companyId
        ? (companyById(directory?.companies ?? [], companyId)?.dealer_id ?? null)
        : null;
  const dealerRow = (id: string | null | undefined): DealersRow | undefined =>
    directory?.dealers.find((d) => d.id === id);
  // Customers see their dealer's brand when it's a white-label reseller.
  const brand = app === 'customer' && dealerId ? brandOf(dealerRow(dealerId)) : EIT_BRAND;

  const signIn = useCallback(
    (email: string, password: string, entry: Entry, homePath: string, remember = true) => {
      if (!directory) return 'Still loading accounts from Neon. Try again in a moment.';
      const r = checkSignIn(directory, entry, email, password);
      if (!r.ok) return r.error;
      persistSupport(null);
      persist({ userId: String(r.user.id), home: homePath, remember });
      setNotice(null);
      return null;
    },
    [directory, persist, persistSupport],
  );

  const signOut = useCallback(() => {
    const home = stored?.home || '/';
    persist(null);
    persistSupport(null);
    navigate(home);
  }, [stored, persist, persistSupport, navigate]);

  // A role switch re-reads everything, so the new role sees the latest data (legacy parity).
  const switchUser = useCallback(
    (userId: string) => {
      persist({ userId, home: stored?.home || '/', remember: stored?.remember });
      void reload();
    },
    [persist, stored, reload],
  );

  const startSupport: AuthValue['startSupport'] = useCallback(
    async ({ level, account: target, product, reason }) => {
      if (support) throw new Error(SUPPORT_VIEW_ONLY);
      if (!reason.trim()) throw new Error('Please give a reason.');
      const id = nextSupportId(supportSessions.data ?? []);
      await save.mutateAsync('support_sessions', {
        id,
        actor_user_id: user?.id ?? null,
        target_level: level,
        target_account_id: target,
        product_id: product || null,
        reason: reason.trim(),
        started_at: new Date().toISOString(),
      });
      const to = level === 'Company' ? 'customer' : 'partner';
      return { id, url: appLink(to, `/support/${id}`) };
    },
    [supportSessions.data, save, user, support],
  );

  // A support link works once: opening it marks the session's link as used, in one statement,
  // so a second tab (or anyone the link was forwarded to) is refused.
  const openSupport = useCallback(
    async (sessionId: string) => {
      const row = supportSessions.data?.find((s) => s.id.toLowerCase() === sessionId.toLowerCase());
      const refuse = (msg: string) => {
        persistSupport(null);
        setNotice(msg);
        return false;
      };
      // An ended, expired or wrong-app session says so first; otherwise a used link says it was used.
      if (!row || !supportLinkValid({ ...row, link_opened_at: null }, app))
        return refuse(SUPPORT_LINK_INVALID);
      if (row.link_opened_at) return refuse(SUPPORT_LINK_USED);
      try {
        if (!(await markOnce('support_sessions', row.id, 'link_opened_at')))
          return refuse(SUPPORT_LINK_USED);
      } catch (e) {
        return refuse((e as Error).message);
      }
      persistSupport(row.id);
      setNotice(null);
      return true;
    },
    [supportSessions.data, app, persistSupport, markOnce],
  );

  const endSupport = useCallback(async () => {
    if (!support) return;
    // The one write allowed during a support session: logging its end.
    await update.mutateAsync('support_sessions', {
      id: support.session.id,
      ended_at: new Date().toISOString(),
    });
    persistSupport(null);
    setNotice(SUPPORT_ENDED);
    navigate('/');
  }, [support, update, persistSupport, navigate]);

  const setSupportAccess: AuthValue['setSupportAccess'] = useCallback(
    async (level, target, on) => {
      // View-only: the person giving support can't change who may give support.
      if (support) throw new Error(SUPPORT_VIEW_ONLY);
      const until = on ? addDays(new Date(), SUPPORT_GRANT_DAYS) : null;
      if (level === 'Company')
        await update.mutateAsync('company', { id: Number(target), support_access_until: until });
      else await update.mutateAsync('dealers', { id: target, support_access_until: until });
    },
    [update, support],
  );

  const value: AuthValue = {
    app,
    appName: APPS[app].name,
    loading,
    error,
    directory,
    rules,
    user,
    role,
    account,
    companyId,
    dealerId,
    brand,
    home: stored?.home || '/',
    notice,
    setNotice,
    signIn,
    signOut,
    switchUser,
    loginUsers: (entry) => (directory ? loginUsers(directory, entry) : []),
    brandFor: (id) => (isWhiteLabel(dealerRow(id)) ? brandOf(dealerRow(id)) : EIT_BRAND),
    support,
    startSupport,
    openSupport,
    endSupport,
    setSupportAccess,
  };

  return (
    <AuthContext.Provider value={value}>
      <ReadOnlyData reason={support ? SUPPORT_VIEW_ONLY : null}>{children}</ReadOnlyData>
    </AuthContext.Provider>
  );
}
