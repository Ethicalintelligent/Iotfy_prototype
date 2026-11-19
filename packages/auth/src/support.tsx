// Support sessions: the banner, the start dialog, the "open in the other app" link, the
// access card (customer or dealer allows support for 7 days) and the session log.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Chip,
  Loading,
  Modal,
  Note,
  SelectField,
  Stack,
  SupportBar,
  Table,
  TextField,
  useToast,
} from '@iotify/ui';
import type { SupportSessionsRow } from '@iotify/data';
import { useSupportSessions } from '@iotify/data';
import { useAuth } from './AuthProvider';
import { APPS, supportAllowed, supportApp } from './logic';

const nameOfUser = (auth: ReturnType<typeof useAuth>, id: string | null | undefined) =>
  auth.directory?.users.find((u) => u.id === id)?.name ?? id ?? '—';
const nameOfAccount = (auth: ReturnType<typeof useAuth>, id: string | null | undefined) =>
  auth.directory?.companies.find((c) => c.id === id)?.name ??
  auth.directory?.dealers.find((d) => d.id === id)?.name ??
  id ??
  '—';
const nameOfNode = (auth: ReturnType<typeof useAuth>, id: string | null | undefined) =>
  auth.directory?.nodes.find((n) => n.id === id)?.name ?? id ?? '';

/** Amber banner at the top of every page during a support session, with End session. */
export function SupportBanner() {
  const auth = useAuth();
  const toast = useToast();
  const [ending, setEnding] = useState(false);
  if (!auth.support) return null;
  const s = auth.support.session;
  return (
    <SupportBar
      action={
        <Button
          size="sm"
          disabled={ending}
          onClick={async () => {
            setEnding(true);
            try {
              await auth.endSupport();
            } catch (e) {
              toast(`The session could not be ended: ${(e as Error).message}`);
            } finally {
              setEnding(false);
            }
          }}
        >
          {ending ? 'Ending…' : 'End session'}
        </Button>
      }
    >
      <b>Support session</b> · {auth.support.actor?.name ?? 'Support'} is viewing{' '}
      {nameOfAccount(auth, s.target_account_id)}
      {s.product_id ? ` · ${nameOfNode(auth, s.product_id)}` : ''} · view-only · Reason: {s.reason}
    </SupportBar>
  );
}

/**
 * Starts a support session: reason (required) and, for a company, which app. The session is
 * logged, then a link opens it in the other app.
 */
export function SupportDialog({
  level,
  account,
  onClose,
}: {
  level: 'Company' | 'Dealer';
  account: string | null;
  onClose: () => void;
}) {
  const auth = useAuth();
  const apps = level === 'Company' && account && auth.rules ? auth.rules.myApps(account) : [];
  const [reason, setReason] = useState('');
  const [product, setProduct] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => {
    setReason('');
    setError(null);
    setLink(null);
    setProduct(apps[0]?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);
  const target = level === 'Company' ? 'customer' : 'partner';

  if (link)
    return (
      <Modal
        open
        onClose={onClose}
        title="Support session started"
        maxWidth={460}
        footer={
          <>
            <Button onClick={onClose}>Close</Button>
            <a
              className="ui-btn ui-btn--primary"
              href={link.url}
              target="_blank"
              rel="noopener"
              data-testid="support-link"
            >
              Open {APPS[target].name} ↗
            </a>
          </>
        }
      >
        <p className="ui-muted" style={{ margin: 0 }}>
          Session {link.id} for {nameOfAccount(auth, account)} is logged. Open it in the{' '}
          {APPS[target].name}. The link works while the session is open, for up to 2 hours.
        </p>
      </Modal>
    );

  return (
    <Modal
      open={!!account}
      onClose={onClose}
      title={`Support session · ${nameOfAccount(auth, account)}`}
      maxWidth={460}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              if (!reason.trim()) {
                setError('Please give a reason.');
                return;
              }
              setBusy(true);
              setError(null);
              try {
                setLink(
                  await auth.startSupport({
                    level,
                    account: account!,
                    product: level === 'Company' ? product : null,
                    reason,
                  }),
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Starting…' : 'Start session'}
          </Button>
        </>
      }
    >
      <p className="ui-muted" style={{ margin: 0 }}>
        You'll see what {level === 'Company' ? 'the customer' : 'the dealer'} sees, view-only. The
        session and your reason are logged and visible to them.
      </p>
      {level === 'Company' && (
        <SelectField
          label="App"
          name="app"
          value={product}
          onChange={setProduct}
          options={apps.map((n) => ({ value: n.id, label: n.name ?? n.id }))}
        />
      )}
      <TextField
        label="Reason (required)"
        name="reason"
        value={reason}
        onChange={setReason}
        placeholder="e.g. Ticket 1182: alerts not arriving"
      />
      {error && <Note role="alert">{error}</Note>}
    </Modal>
  );
}

/** Support sessions for an account, newest first. */
export function SupportLog({ account }: { account: string }) {
  const auth = useAuth();
  const sessions = useSupportSessions({ target_account_id: account });
  const rows = [...(sessions.data ?? [])].sort((a, b) =>
    String(b.started_at).localeCompare(String(a.started_at)),
  );
  if (sessions.isLoading) return <Loading>Loading support log…</Loading>;
  if (!rows.length)
    return (
      <p className="ui-muted" style={{ margin: 0 }}>
        No support sessions yet.
      </p>
    );
  return (
    <Table<SupportSessionsRow>
      label="Support sessions"
      rows={rows}
      columns={[
        {
          header: 'When',
          cell: (r) =>
            String(r.started_at ?? '')
              .slice(0, 16)
              .replace('T', ' '),
        },
        { header: 'Who', cell: (r) => nameOfUser(auth, r.actor_user_id) },
        {
          header: 'App',
          cell: (r) => (r.product_id ? nameOfNode(auth, r.product_id) : 'Dealer console'),
        },
        { header: 'Reason', cell: 'reason' },
        {
          header: 'Ended',
          cell: (r) => (r.ended_at ? String(r.ended_at).slice(11, 16) : <Chip>Open</Chip>),
        },
      ]}
    />
  );
}

/**
 * For a company or dealer: allow support for 7 days (or turn it off now), and see the log.
 * Button actions save at once.
 */
export function SupportAccessCard({
  level,
  account,
}: {
  level: 'Company' | 'Dealer';
  account: string;
}) {
  const auth = useAuth();
  const toast = useToast();
  const rec =
    level === 'Company'
      ? auth.directory?.companies.find((c) => c.id === account)
      : auth.directory?.dealers.find((d) => d.id === account);
  const on = supportAllowed(rec);
  const dealerName =
    level === 'Company'
      ? nameOfAccount(auth, auth.directory?.companies.find((c) => c.id === account)?.dealer_id)
      : '';
  const [busy, setBusy] = useState(false);
  const run = async (allow: boolean) => {
    setBusy(true);
    try {
      await auth.setSupportAccess(level, account, allow);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card
      title="Support access"
      actions={
        on ? (
          <Chip tone="green">Allowed until {String(rec?.support_access_until).slice(0, 10)}</Chip>
        ) : (
          <Chip>Off</Chip>
        )
      }
    >
      <p className="ui-muted" style={{ margin: 0 }}>
        Let {level === 'Company' ? `your dealer (${dealerName})` : 'EIT support'} open your{' '}
        {level === 'Company' ? 'apps' : 'console'} to help you. Sessions are view-only, need a
        reason, and are listed below.
      </p>
      <Stack>
        {on ? (
          <Button disabled={busy} onClick={() => run(false)}>
            Turn off now
          </Button>
        ) : (
          <Button variant="primary" disabled={busy} onClick={() => run(true)}>
            Allow for 7 days
          </Button>
        )}
      </Stack>
      <SupportLog account={account} />
    </Card>
  );
}

/** /support/:id: opens a support link in this app, or shows why it can't. */
export function SupportRoute({ onOpened }: { onOpened: (s: SupportSessionsRow) => string }) {
  const { id = '' } = useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const ready = !auth.loading && !!auth.directory;
  const [tried, setTried] = useState(false);
  useEffect(() => {
    if (!ready || tried) return;
    setTried(true);
    auth.openSupport(id); // the session shows up in auth.support on the next render
  }, [ready, tried, id, auth]);
  useEffect(() => {
    if (!tried || !ready) return;
    if (
      auth.support &&
      auth.support.session.id.toLowerCase() === id.toLowerCase() &&
      supportApp(auth.support.session) === auth.app
    )
      navigate(onOpened(auth.support.session), { replace: true });
    else if (auth.notice) navigate('/', { replace: true });
  }, [tried, ready, auth.support, auth.notice, id, auth.app, navigate, onOpened]);
  return <Loading>Opening the support session…</Loading>;
}
