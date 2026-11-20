// Dealer sign-in accounts: who can sign in to the Partner Portal for a dealer, adding a Dealer
// Admin (saves at once), and the sign-in details to send them. Demo: any password works.
import { useEffect, useState } from 'react';
import { Button, Chip, FieldGrid, Modal, Note, Stack, Table, TextField, useToast } from '@iotify/ui';
import { useSaveRecord, useTable, type DealersRow, type UsersRow } from '@iotify/data';
import { APPS, appLink, userEmail } from '@iotify/auth';
import { nextId } from '@iotify/app-kit';

/** The Partner Portal's sign-in page, as a full address to send. */
const partnerSignInUrl = () => new URL(appLink('partner', '/'), window.location.href).href;

async function copyText(text: string, toast: (m: string) => void, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast(`${what} copied.`);
  } catch {
    toast(`Couldn't copy. Select the text and copy it yourself.`);
  }
}

/** "Sign-in accounts" section on the dealer card. `autoAdd`: open "Add Dealer Admin" at once. */
export function DealerSignIns({
  dealer,
  autoAdd,
  onAutoAddDone,
}: {
  dealer: DealersRow;
  autoAdd?: boolean;
  onAutoAddDone?: () => void;
}) {
  const accounts = useTable('users', { level: 'Dealer', account_id: dealer.id });
  const [adding, setAdding] = useState(false);
  const [details, setDetails] = useState<UsersRow | null>(null);
  const list = accounts.data ?? [];

  useEffect(() => {
    if (autoAdd && accounts.data && !accounts.data.length) {
      setAdding(true);
      onAutoAddDone?.();
    }
  }, [autoAdd, accounts.data, onAutoAddDone]);

  return (
    <>
      <Stack justify="space-between">
        <b style={{ fontSize: 14, marginTop: 8 }}>Sign-in accounts</b>
        <Button size="sm" icon="plus" onClick={() => setAdding(true)}>
          Dealer Admin
        </Button>
      </Stack>
      <p className="ui-muted" style={{ margin: 0 }}>
        People of this dealer who sign in to the {APPS.partner.name}. Demo: any password works.
      </p>
      {accounts.isLoading ? null : list.length ? (
        <Table<UsersRow>
          bare
          label="Sign-in accounts"
          rows={list}
          empty=""
          columns={[
            { header: 'Name', cell: (u) => <b>{u.name}</b> },
            { header: 'Sign-in email', cell: (u) => userEmail(u) },
            { header: 'Role', cell: () => <Chip tone="blue">Dealer Admin</Chip> },
            {
              header: '',
              align: 'right',
              cell: (u) => (
                <Button size="sm" onClick={() => setDetails(u)}>
                  Sign-in details
                </Button>
              ),
            },
          ]}
        />
      ) : (
        <Note tone="red">
          <Stack justify="space-between" wrap>
            <span>
              No one can sign in for this dealer yet. Add a Dealer Admin so they can use the
              Partner Portal.
            </span>
            <Button size="sm" variant="primary" icon="plus" onClick={() => setAdding(true)}>
              Dealer Admin
            </Button>
          </Stack>
        </Note>
      )}
      {adding && (
        <AddDealerAdminDialog
          dealer={dealer}
          onClose={() => setAdding(false)}
          onAdded={(u) => {
            setAdding(false);
            setDetails(u);
          }}
        />
      )}
      {details && (
        <SignInDetailsDialog dealer={dealer} user={details} onClose={() => setDetails(null)} />
      )}
    </>
  );
}

/** Name and optional email of a new Dealer Admin. Save adds the user at once. */
function AddDealerAdminDialog({
  dealer,
  onClose,
  onAdded,
}: {
  dealer: DealersRow;
  onClose: () => void;
  onAdded: (u: UsersRow) => void;
}) {
  const users = useTable('users');
  const roles = useTable('roles');
  const save = useSaveRecord();
  const [name, setName] = useState(`${dealer.name ?? dealer.id} admin`);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const all = users.data ?? [];
  const roleId =
    roles.data?.find((r) => r.level === 'Dealer' && r.name === 'Dealer Admin')?.id ?? null;
  const shownEmail = userEmail({ name, email: email.trim() || null });

  const submit = () => {
    setError(null);
    if (!name.trim()) return setError('Enter a name.');
    if (!roleId) return setError('The Dealer Admin role is missing in the roles table.');
    const taken = all.find((u) => userEmail(u).toLowerCase() === shownEmail.toLowerCase());
    if (taken) return setError(`${shownEmail} is already used by ${taken.name}. Use another email.`);
    const row: UsersRow = {
      id: nextId('U', all),
      name: name.trim(),
      email: email.trim() || null,
      level: 'Dealer',
      account_id: dealer.id,
      role_id: roleId,
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
      title={`New · Dealer Admin for ${dealer.name ?? dealer.id}`}
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
          <TextField label="Admin name" required value={name} onChange={setName} name="name" />
          <TextField
            label="Sign-in email"
            type="email"
            name="email"
            value={email}
            onChange={setEmail}
            placeholder={userEmail({ name, email: null })}
          />
        </FieldGrid>
        <Note tone="grey">
          Leave the email empty to use a demo address made from the name. This person signs in to
          the {APPS.partner.name} as Dealer Admin.
        </Note>
        {error && <Note tone="red">{error}</Note>}
      </Stack>
    </Modal>
  );
}

/** What to send the dealer: sign-in page, email and the demo password rule. */
function SignInDetailsDialog({
  dealer,
  user,
  onClose,
}: {
  dealer: DealersRow;
  user: UsersRow;
  onClose: () => void;
}) {
  const toast = useToast();
  const url = partnerSignInUrl();
  const email = userEmail(user);
  const all = [
    `${APPS.partner.name}: sign-in details for ${dealer.name ?? dealer.id}`,
    `Sign-in page: ${url}`,
    `Email: ${email}`,
    'Password: any password (prototype demo)',
  ].join('\n');

  const row = (label: string, value: React.ReactNode, copy?: string) => (
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
          Send these to {dealer.name ?? dealer.id}. They stay on the dealer's card under Sign-in
          accounts.
        </p>
        {row('App', <b>{APPS.partner.name}</b>)}
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
            <Chip tone="blue">Dealer Admin</Chip> · {user.name}
          </>,
        )}
        <Note tone="amber">
          Prototype: there are no real passwords yet. Any password works for a known email.
        </Note>
      </Stack>
    </Modal>
  );
}
