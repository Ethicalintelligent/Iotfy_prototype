// Sign-in accounts of one dealer or company: list, add (saves at once), the sign-in details to
// send, and delete after confirm. Used by the Admin Console (dealer card), the Partner Portal
// (company card) and Customer Apps (Team). Demo: any password works.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Button,
  Chip,
  FieldGrid,
  Modal,
  Note,
  SelectField,
  Stack,
  Table,
  TextField,
  useToast,
} from '@iotify/ui';
import {
  useDeleteRecord,
  useSaveRecord,
  useTable,
  type RolesRow,
  type UsersRow,
} from '@iotify/data';
import { APPS, nextUserId, sessionFor, userEmail, type AppKind, type Role } from './logic';
import { appLink, useAuth } from './AuthProvider';

export interface SignInAccountsProps {
  level: 'Dealer' | 'Company';
  /** The dealer or company the accounts belong to. */
  account: { id: string; name?: string | null };
  /** Role names that can be given (from core.roles at this level); the first is the default. */
  roleNames: string[];
  /** Keep at least one account with this role (it can't be deleted while it's the last). */
  keepRole?: string;
  /** Section title (default "Sign-in accounts"); null hides the header line. */
  title?: string | null;
  intro?: ReactNode;
  /** Red note when nobody can sign in yet. */
  emptyText: string;
  /** Label on the add buttons, e.g. "Company Admin" or "Person". */
  addLabel: string;
  canDelete?: boolean;
  readOnly?: boolean;
  /** Open "Add" at once (right after the dealer or company was created). */
  autoAdd?: boolean;
  onAutoAddDone?: () => void;
}

type AccountTone = 'blue' | 'green' | 'amber';
const TONE: Record<Role, AccountTone> = {
  platform: 'blue',
  dealer: 'blue',
  company: 'green',
  fleet: 'amber',
};

/** The app these accounts sign in to, and its sign-in page as a full address. */
const appOf = (level: SignInAccountsProps['level']): AppKind =>
  level === 'Dealer' ? 'partner' : 'customer';
const signInUrl = (app: AppKind) => new URL(appLink(app, '/'), window.location.href).href;

async function copyText(text: string, toast: ReturnType<typeof useToast>, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast(`${what} copied.`);
  } catch {
    toast({ type: 'warning', title: "Couldn't copy", desc: 'Select the text and copy it yourself.' });
  }
}

/** The roles by name, in the given order (fleet roles are level "User" in core.roles). */
function useNamedRoles(names: string[]) {
  const roles = useTable('roles');
  return useMemo(() => {
    const all = roles.data ?? [];
    return names
      .map((n) => all.find((r) => r.name === n))
      .filter((r): r is RolesRow => !!r);
  }, [roles.data, names]);
}

export function SignInAccounts(props: SignInAccountsProps) {
  const {
    level,
    account,
    keepRole,
    title = 'Sign-in accounts',
    intro,
    emptyText,
    addLabel,
    canDelete,
    readOnly,
    autoAdd,
    onAutoAddDone,
  } = props;
  const auth = useAuth();
  const accounts = useTable('users', { level, account_id: account.id });
  const roles = useTable('roles');
  const [adding, setAdding] = useState(false);
  const [details, setDetails] = useState<UsersRow | null>(null);
  const [removing, setRemoving] = useState<UsersRow | null>(null);
  const list = accounts.data ?? [];
  const roleName = (u: UsersRow) => roles.data?.find((r) => r.id === u.role_id)?.name ?? '';
  const tone = (u: UsersRow) => TONE[sessionFor(u, roles.data ?? []).role];

  useEffect(() => {
    if (autoAdd && !readOnly && accounts.data && !accounts.data.length) {
      setAdding(true);
      onAutoAddDone?.();
    }
  }, [autoAdd, readOnly, accounts.data, onAutoAddDone]);

  const addButton = (primary?: boolean) =>
    !readOnly && (
      <Button
        size="sm"
        variant={primary ? 'primary' : 'default'}
        icon="plus"
        onClick={() => setAdding(true)}
      >
        {addLabel}
      </Button>
    );

  return (
    <>
      {title !== null ? (
        <Stack justify="space-between">
          <b style={{ fontSize: 14, marginTop: 8 }}>{title}</b>
          {addButton()}
        </Stack>
      ) : (
        list.length > 0 && <Stack justify="flex-end">{addButton(true)}</Stack>
      )}
      {intro && (
        <p className="ui-muted" style={{ margin: 0 }}>
          {intro}
        </p>
      )}
      {accounts.isLoading ? null : list.length ? (
        <Table<UsersRow>
          bare
          label={title ?? 'Sign-in accounts'}
          rows={list}
          empty=""
          columns={[
            { header: 'Name', cell: (u) => <b>{u.name}</b> },
            { header: 'Sign-in email', cell: (u) => userEmail(u) },
            { header: 'Role', cell: (u) => <Chip tone={tone(u)}>{roleName(u)}</Chip> },
            {
              header: '',
              align: 'right',
              cell: (u) => (
                <Stack gap={8} justify="flex-end">
                  <Button size="sm" data-user={u.id} onClick={() => setDetails(u)}>
                    Sign-in details
                  </Button>
                  {canDelete && !readOnly && u.id !== auth.user?.id && (
                    <Button size="sm" variant="ghost" onClick={() => setRemoving(u)}>
                      Delete
                    </Button>
                  )}
                </Stack>
              ),
            },
          ]}
        />
      ) : (
        <Note tone="red">
          <Stack justify="space-between" wrap>
            <span>{emptyText}</span>
            {addButton(true)}
          </Stack>
        </Note>
      )}
      {adding && (
        <AddAccountDialog
          {...props}
          onClose={() => setAdding(false)}
          onAdded={(u) => {
            setAdding(false);
            setDetails(u);
          }}
        />
      )}
      {details && (
        <SignInDetailsDialog
          level={level}
          account={account}
          user={details}
          role={roleName(details)}
          tone={tone(details)}
          onClose={() => setDetails(null)}
        />
      )}
      {removing && (
        <DeleteAccountDialog
          user={removing}
          lastOfRole={
            !!keepRole &&
            roleName(removing) === keepRole &&
            list.filter((u) => roleName(u) === keepRole).length <= 1
              ? keepRole
              : null
          }
          onClose={() => setRemoving(null)}
        />
      )}
    </>
  );
}

/** Name, optional email and (when there's a choice) role. Save adds the account at once. */
function AddAccountDialog({
  level,
  account,
  roleNames,
  addLabel,
  onClose,
  onAdded,
}: SignInAccountsProps & { onClose: () => void; onAdded: (u: UsersRow) => void }) {
  const users = useTable('users');
  const roles = useNamedRoles(roleNames);
  const save = useSaveRecord();
  const first = roles[0];
  const [roleId, setRoleId] = useState('');
  const chosen = roles.find((r) => r.id === roleId) ?? first;
  const [name, setName] = useState(
    roleNames.length === 1 ? `${account.name ?? account.id} admin` : '',
  );
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const all = users.data ?? [];
  const shownEmail = userEmail({ name, email: email.trim() || null });
  const app = APPS[appOf(level)].name;

  const submit = () => {
    setError(null);
    if (!name.trim()) return setError('Enter a name.');
    if (!chosen)
      return setError(`The ${roleNames.join(' / ')} role is missing in the roles table.`);
    const taken = all.find((u) => userEmail(u).toLowerCase() === shownEmail.toLowerCase());
    if (taken) return setError(`${shownEmail} is already used by ${taken.name}. Use another email.`);
    const row: UsersRow = {
      id: nextUserId(all),
      name: name.trim(),
      email: email.trim() || null,
      level,
      account_id: account.id,
      role_id: chosen.id,
    };
    save.mutate('users', row, {
      onSuccess: () => onAdded(row),
      onError: (e) => setError(e.message),
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`New · ${addLabel} for ${account.name ?? account.id}`}
      maxWidth={520}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={save.isPending || !users.data} onClick={submit}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <Stack dir="col" gap={14} align="stretch">
        <FieldGrid>
          <TextField label="Name" required value={name} onChange={setName} name="name" />
          <TextField
            label="Sign-in email"
            type="email"
            name="email"
            value={email}
            onChange={setEmail}
            placeholder={userEmail({ name: name || 'name', email: null })}
          />
          {roles.length > 1 && (
            <SelectField
              label="Role"
              name="role_id"
              required
              value={chosen?.id ?? ''}
              onChange={setRoleId}
              options={roles.map((r) => ({ value: r.id, label: r.name ?? r.id }))}
            />
          )}
        </FieldGrid>
        <Note tone="grey">
          Leave the email empty to use a demo address made from the name. This person signs in to
          the {app}
          {roles.length === 1 ? ` as ${chosen?.name ?? roleNames[0]}` : ''}.
        </Note>
        {error && <Note tone="red">{error}</Note>}
      </Stack>
    </Modal>
  );
}

/** What to send the person: app, sign-in page, email and the demo password rule. */
function SignInDetailsDialog({
  level,
  account,
  user,
  role,
  tone,
  onClose,
}: {
  level: SignInAccountsProps['level'];
  account: SignInAccountsProps['account'];
  user: UsersRow;
  role: string;
  tone: AccountTone;
  onClose: () => void;
}) {
  const toast = useToast();
  const app = appOf(level);
  const url = signInUrl(app);
  const email = userEmail(user);
  const who = account.name ?? account.id;
  const all = [
    `${APPS[app].name}: sign-in details for ${user.name} (${who})`,
    `Sign-in page: ${url}`,
    `Email: ${email}`,
    'Password: any password (prototype demo)',
  ].join('\n');

  const row = (label: string, value: ReactNode, copy?: string) => (
    <Stack justify="space-between" gap={12}>
      <span className="ui-muted" style={{ minWidth: 100 }}>
        {label}
      </span>
      <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{value}</span>
      {copy !== undefined && (
        <Button size="sm" onClick={() => copyText(copy, toast, label)}>
          Copy
        </Button>
      )}
    </Stack>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="Sign-in details"
      badge={user.id}
      maxWidth={560}
      footer={
        <>
          <Button onClick={() => copyText(all, toast, 'Sign-in details')}>Copy all</Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <Stack dir="col" gap={14} align="stretch">
        <p style={{ margin: 0 }} className="ui-muted">
          Send these to {user.name}. They stay under Sign-in accounts for {who}.
        </p>
        {row('App', <b>{APPS[app].name}</b>)}
        {row(
          'Sign-in page',
          <a href={url} target="_blank" rel="noreferrer">
            {url}
          </a>,
          url,
        )}
        {row('Email', <code>{email}</code>, email)}
        {row(
          'Password',
          <>
            Any password <Chip tone="amber">Demo</Chip>
          </>,
        )}
        {row(
          'Role',
          <>
            <Chip tone={tone}>{role}</Chip> · {user.name}
          </>,
        )}
        <Note tone="amber">
          Prototype: there are no real passwords yet. Any password works for a known email.
        </Note>
      </Stack>
    </Modal>
  );
}

/** Delete after confirm; the last account with the kept role can't be deleted. */
function DeleteAccountDialog({
  user,
  lastOfRole,
  onClose,
}: {
  user: UsersRow;
  lastOfRole: string | null;
  onClose: () => void;
}) {
  const del = useDeleteRecord();
  return (
    <Modal
      open
      onClose={onClose}
      title={`Delete ${user.name}?`}
      maxWidth={440}
      footer={
        <>
          <Button onClick={onClose}>{lastOfRole || del.error ? 'Close' : 'Cancel'}</Button>
          {!lastOfRole && !del.error && (
            <Button
              variant="danger"
              disabled={del.isPending}
              onClick={() => del.mutate('users', { id: user.id }, { onSuccess: onClose })}
            >
              {del.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          )}
        </>
      }
    >
      {lastOfRole ? (
        <Note>
          {user.name} is the only {lastOfRole}. Add another {lastOfRole} first, so someone can
          still manage the team.
        </Note>
      ) : del.error ? (
        <Note tone="red">
          <b>Can't delete.</b> {del.error.message}
        </Note>
      ) : (
        <p className="ui-muted" style={{ margin: 0 }}>
          {user.name} ({userEmail(user)}) won't be able to sign in any more. This can't be undone.
        </p>
      )}
    </Modal>
  );
}
