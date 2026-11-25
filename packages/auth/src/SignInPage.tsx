import { useState, type FormEvent, type ReactNode } from 'react';
import {
  BrandLogo,
  Button,
  CheckboxField,
  DemoAccountButton,
  DemoAccountGrid,
  DemoAccountGroup,
  DemoAccountGroups,
  SearchInput,
  DividerText,
  Loading,
  Note,
  SignInLayout,
  TextField,
} from '@iotify/ui';
import { useAuth } from './AuthProvider';
import {
  ROLE_NAMES,
  ROLE_TONE,
  accountOf,
  companyById,
  sessionFor,
  userEmail,
  type Brand,
  type Entry,
} from './logic';

export interface SignInPageProps {
  entry: Entry;
  /** Path of this sign-in page; signing out later returns here. */
  homePath: string;
  /** "Sign in to …" */
  title: string;
  heading?: ReactNode;
  intro?: ReactNode;
  /** Shown under the intro on the dark panel. */
  hero?: ReactNode;
  /** Brand on the dark panel (white-label pages); default EIT. */
  brand?: Brand;
  /** Shown when the page has no demo accounts (e.g. nobody bought the product yet). */
  emptyAccounts?: ReactNode;
  /** Called after a successful sign-in (e.g. go to My apps). */
  onSignedIn?: () => void;
}

/** More demo accounts than this: search box and accounts grouped by company. */
const GROUP_FROM = 6;

/** Demo sign-in: work email and any password, or pick a demo account. */
export function SignInPage({
  entry,
  homePath,
  title,
  heading,
  intro,
  hero,
  brand,
  emptyAccounts,
  onSignedIn,
}: SignInPageProps) {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const accounts = auth.loginUsers(entry);
  const b = brand ?? auth.brandFor(entry.dealer);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = auth.signIn(email, password, entry, homePath, remember);
    setError(err);
    if (!err) onSignedIn?.();
  };
  const accountDetail = (id: number | undefined) => {
    const u = accounts.find((x) => x.id === id)!;
    const dir = auth.directory!;
    const { role } = sessionFor(u, dir.roles);
    const roleName = dir.roles.find((r) => r.id === u.role_id)?.name || ROLE_NAMES[role];
    const where =
      role === 'platform'
        ? 'EIT'
        : role === 'dealer'
          ? dir.dealers.find((d) => d.id === accountOf(u))?.name
          : companyById(dir.companies, accountOf(u))?.name;
    return { roleName, where: where ?? accountOf(u), tone: ROLE_TONE[role] };
  };

  const accountButton = (u: (typeof accounts)[number], withWhere: boolean) => {
    const d = accountDetail(u.id);
    return (
      <DemoAccountButton
        key={u.id}
        name={u.name ?? u.id}
        detail={withWhere ? `${d.roleName} · ${d.where}` : d.roleName}
        tone={d.tone}
        data-user={u.id}
        onClick={() => {
          setEmail(userEmail(u));
          setPassword('demo1234');
          setError(null);
        }}
      />
    );
  };
  // Long lists: grouped by company (or dealer), sorted, filtered by the search box.
  const q = query.trim().toLowerCase();
  const groups = [
    ...accounts
      .filter((u) => {
        if (!q) return true;
        const d = accountDetail(u.id);
        return `${u.name} ${d.where} ${d.roleName} ${userEmail(u)}`.toLowerCase().includes(q);
      })
      .reduce((m, u) => {
        const where = accountDetail(u.id).where || 'Other';
        m.set(where, [...(m.get(where) ?? []), u]);
        return m;
      }, new Map<string, typeof accounts>()),
  ].sort(([a], [b]) => a.localeCompare(b));

  const form = (
    <form
      className="ui-signin-form"
      onSubmit={submit}
      noValidate
      aria-label={title}
      style={{ display: 'contents' }}
    >
      {auth.notice && (
        <Note tone="grey" role="status">
          {auth.notice}
        </Note>
      )}
      <TextField
        label="Email"
        type="email"
        name="email"
        value={email}
        onChange={setEmail}
        placeholder="name@company.com"
      />
      <TextField
        label="Password"
        type="password"
        name="password"
        value={password}
        onChange={setPassword}
        placeholder="Any password (demo)"
      />
      <div>
        <CheckboxField label="Keep me signed in" checked={remember} onChange={setRemember} />
        {!remember && (
          <p className="ui-muted" style={{ fontSize: 12, margin: '4px 0 0 26px' }}>
            You’ll be signed out when you close this tab.
          </p>
        )}
      </div>
      {error && (
        <Note role="alert" tone="red">
          {error}
        </Note>
      )}
      <Button type="submit" variant="primary" style={{ minHeight: 40, fontSize: 13 }}>
        Sign in
      </Button>
      {entry.app !== 'admin' && (
        <p className="ui-muted" style={{ fontSize: 12, margin: 0, textAlign: 'center' }}>
          First time? {entry.app === 'partner' ? 'EIT' : 'Your dealer'} sent you your sign-in
          email.
        </p>
      )}
      <DividerText>Demo accounts</DividerText>
      {auth.loading ? (
        <Loading>Loading demo accounts…</Loading>
      ) : auth.error ? (
        <Note>{auth.error.message}</Note>
      ) : accounts.length > GROUP_FROM ? (
        <>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search company or person"
          />
          <DemoAccountGroups>
            {groups.length ? (
              groups.map(([where, list]) => (
                <DemoAccountGroup key={where} title={where}>
                  {list.map((u) => accountButton(u, false))}
                </DemoAccountGroup>
              ))
            ) : (
              <p className="ui-muted" style={{ fontSize: 12, margin: 0, textAlign: 'center' }}>
                No demo account matches “{query}”.
              </p>
            )}
          </DemoAccountGroups>
        </>
      ) : accounts.length ? (
        <DemoAccountGrid>{accounts.map((u) => accountButton(u, true))}</DemoAccountGrid>
      ) : (
        emptyAccounts && (
          <p className="ui-muted" style={{ fontSize: 12, margin: 0, textAlign: 'center' }}>
            {emptyAccounts}
          </p>
        )
      )}
      <p className="ui-muted" style={{ fontSize: 11, textAlign: 'center', margin: 0 }}>
        Demo: pick an account to fill the form. Any password works.
      </p>
    </form>
  );

  return (
    <SignInLayout
      brand={
        <>
          <BrandLogo text={b.initials} color={b.color} imageUrl={b.logoUrl} />
          <span>
            <b>{b.whiteLabel ? b.name : auth.appName}</b>
            <small>{b.whiteLabel ? 'IoT platform' : 'IoT platform by EIT'}</small>
          </span>
        </>
      }
      heading={heading}
      intro={intro}
      footer={`© ${new Date().getFullYear()} ${b.whiteLabel ? b.name : 'Ethical Intelligent Technologies'}`}
      formTitle={title}
      formSubtitle="Use your work email."
      formIcon="lock"
      form={form}
    >
      {hero}
    </SignInLayout>
  );
}
