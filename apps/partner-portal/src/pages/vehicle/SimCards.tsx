// Manage SIM Card: approved GPS Platform design 07-03 (D:/Project/GPS_Platform/approved_degin).
// List (SIM Card No, IMEI No, dates, provider, plan, PUK, support number, status, actions),
// the Add SIM / Edit SIM Card drawer and the delete confirmation.
// The SIM is a core.connectivity row: identifier (ICCID) = Serial Number, number = SIM Card No,
// provider = Provider, device_unit_id = the device it is in. The other fields are in
// proto_vehicle.sim_details. Add / Save Changes write both in one transaction.
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  DateField,
  Drawer,
  FieldAction,
  FormSection,
  IconButton,
  Modal,
  Note,
  RadioGroupField,
  SearchInput,
  SelectField,
  StatusChip,
  Table,
  TextField,
} from '@iotify/ui';
import { Toolbar } from '@iotify/app-kit';
import {
  useConnectivity,
  useDeviceUnits,
  useSaveBatch,
  useSimDetails,
  type ConnectivityRow,
  type SimDetailsRow,
} from '@iotify/data';
import { AddLookupModal, nextIds, txt, useLookupOptions, type LookupKind } from './shared';

const REMINDERS = ['1 week before', '2 weeks before', '1 month before', '2 months before'] as const;
type Reminder = (typeof REMINDERS)[number];

const PATH = '/stock/sims';
const dash = (v: string | null | undefined) => (v ? v : '—');
const day = (v: unknown) => (v ? String(v).slice(0, 10) : '');

/** Active / Inactive as the design shows it (core "Suspended" = Inactive). */
const isActive = (sim: ConnectivityRow, d?: SimDetailsRow) =>
  d ? d.active : sim.status !== 'Suspended';

export function SimCards({ dealer, readOnly }: { dealer: string; readOnly?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const sims = useConnectivity({ owner_dealer_id: dealer }, { enabled: !!dealer });
  const details = useSimDetails();
  const units = useDeviceUnits({ owner_dealer_id: dealer }, { enabled: !!dealer });
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<ConnectivityRow | null>(null);

  const detailOf = (s: ConnectivityRow) =>
    (details.data ?? []).find((d) => d.connectivity_id === s.id);
  const imeiOf = (s: ConnectivityRow) =>
    (units.data ?? []).find((u) => u.id === s.device_unit_id)?.imei ?? null;
  const rows = [...(sims.data ?? [])]
    .filter((s) => {
      if (!q) return true;
      const d = detailOf(s);
      return [s.number, s.identifier, s.provider, imeiOf(s), d?.plan, d?.support_number]
        .join(' ')
        .toLowerCase()
        .includes(q.toLowerCase());
    })
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const editing = id ? (sims.data ?? []).find((s) => s.id === id) : undefined;

  return (
    <>
      <Toolbar search={<SearchInput value={q} onChange={setQ} placeholder="Search SIM cards" />}>
        {!readOnly && (
          <Button size="sm" variant="primary" icon="plus" onClick={() => setAdding(true)}>
            Add SIM Card
          </Button>
        )}
      </Toolbar>
      <Table<ConnectivityRow>
        label="SIM cards"
        rows={rows}
        rowKey={(r) => r.id}
        empty={sims.isLoading ? 'Loading…' : 'No SIM cards yet.'}
        onRowClick={(r) => navigate(`${PATH}/${r.id}`)}
        columns={[
          { header: 'SIM Card No', cell: (r) => <b>{r.number || r.identifier || r.id}</b> },
          { header: 'IMEI No', cell: (r) => dash(imeiOf(r)) },
          { header: 'Date of Purchase', cell: (r) => dash(day(detailOf(r)?.purchase_date)) },
          { header: 'Subscription Date', cell: (r) => dash(day(detailOf(r)?.subscription_date)) },
          { header: 'Provider', cell: (r) => dash(r.provider) },
          { header: 'Plan', cell: (r) => dash(detailOf(r)?.plan) },
          { header: 'Puk Code', cell: (r) => dash(detailOf(r)?.puk_code) },
          { header: 'Support Number', cell: (r) => dash(detailOf(r)?.support_number) },
          {
            header: 'Status',
            cell: (r) => <StatusChip status={isActive(r, detailOf(r)) ? 'Active' : 'Inactive'} />,
          },
          {
            header: 'Actions',
            align: 'right',
            cell: (r) =>
              readOnly ? null : (
                <span
                  style={{ display: 'inline-flex', gap: 4 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconButton
                    icon="edit"
                    label={`Edit SIM card ${r.number || r.identifier}`}
                    onClick={() => navigate(`${PATH}/${r.id}`)}
                  />
                  <IconButton
                    icon="trash"
                    label={`Delete SIM card ${r.number || r.identifier}`}
                    onClick={() => setRemoving(r)}
                  />
                </span>
              ),
          },
        ]}
      />
      {adding && (
        <SimCardDrawer dealer={dealer} all={sims.data ?? []} onClose={() => setAdding(false)} />
      )}
      {/* wait for the SIM details, so the form starts from the saved values */}
      {editing && details.data && (
        <SimCardDrawer
          key={editing.id}
          dealer={dealer}
          all={sims.data ?? []}
          sim={editing}
          detail={detailOf(editing)}
          readOnly={readOnly}
          onClose={() => navigate(PATH)}
        />
      )}
      {removing && (
        <DeleteSimModal
          sim={removing}
          onClose={() => setRemoving(null)}
          onDeleted={() => {
            setRemoving(null);
            if (id === removing.id) navigate(PATH);
          }}
        />
      )}
    </>
  );
}

/** "Delete this sim card?": a button action, deletes at once after the confirmation. */
function DeleteSimModal({
  sim,
  onClose,
  onDeleted,
}: {
  sim: ConnectivityRow;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const save = useSaveBatch();
  const [error, setError] = useState<string | null>(null);
  const del = async () => {
    try {
      // sim_details goes with it (ON DELETE CASCADE)
      await save.mutateAsync({ deletes: [{ table: 'connectivity', keys: [{ id: sim.id }] }] });
      onDeleted();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Delete this sim card?"
      maxWidth={440}
      footer={
        <>
          <Button onClick={onClose}>{error ? 'Close' : 'Cancel'}</Button>
          {!error && (
            <Button variant="danger" disabled={save.isPending} onClick={del}>
              {save.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          )}
        </>
      }
    >
      {error ? (
        <Note tone="red" role="alert">
          <b>Can't delete.</b> {error}
        </Note>
      ) : (
        <p className="ui-muted" style={{ margin: 0 }}>
          This will permanently remove <b>{sim.number || sim.identifier}</b> from SIM inventory.
          This action cannot be undone.
        </p>
      )}
    </Modal>
  );
}

const formOf = (sim?: ConnectivityRow, d?: SimDetailsRow) => ({
  number: sim?.number ?? '',
  serial: sim?.identifier ?? '',
  pin: d?.pin_code ?? '',
  puk: d?.puk_code ?? '',
  support: d?.support_number ?? '',
  provider: sim?.provider ?? '',
  plan: d?.plan ?? '',
  purchase: day(d?.purchase_date),
  subscription: day(d?.subscription_date),
  reminder: d?.expiry_reminder ?? '',
  status: !sim || isActive(sim, d) ? 'Active' : 'Inactive',
});
type Form = ReturnType<typeof formOf>;

/** Add SIM (no `sim`) or Edit SIM Card. */
function SimCardDrawer({
  dealer,
  all,
  sim,
  detail,
  readOnly,
  onClose,
}: {
  dealer: string;
  all: ConnectivityRow[];
  sim?: ConnectivityRow;
  detail?: SimDetailsRow;
  readOnly?: boolean;
  onClose: () => void;
}) {
  const isNew = !sim;
  const start = formOf(sim, detail);
  const [f, setF] = useState<Form>(start);
  const [error, setError] = useState<string | null>(null);
  const [addingLookup, setAddingLookup] = useState<LookupKind | null>(null);
  const lookups = useLookupOptions();
  const save = useSaveBatch();
  const set = (k: keyof Form) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  // keep a value from before (e.g. "Mobily" typed elsewhere) selectable
  const withCurrent = (kind: LookupKind, v: string) => {
    const opts = lookups.options(kind);
    return v && !opts.some((o) => o.value === v) ? [{ value: v, label: v }, ...opts] : opts;
  };

  const submit = async () => {
    setError(null);
    const number = f.number.trim();
    const serial = f.serial.trim().replace(/\s/g, '');
    const missing = [
      !number && 'SIM Card No',
      !serial && 'Serial Number',
      !f.provider && 'Provider',
      !f.plan && 'Plan',
    ].filter(Boolean);
    if (missing.length) return setError(`Fill in: ${missing.join(', ')}.`);
    if (!/^\+?[0-9]{6,15}$/.test(number))
      return setError('SIM Card No: the phone number, 6–15 digits (a leading + is allowed).');
    if (!/^[0-9]{18,22}$/.test(serial)) return setError('Serial Number: the ICCID, 18–22 digits.');
    if (f.pin.trim() && !/^[0-9]{4,8}$/.test(f.pin.trim()))
      return setError('Pin Code: 4–8 digits.');
    if (f.puk.trim() && !/^[0-9]{4,16}$/.test(f.puk.trim()))
      return setError('Puk Code: 4–16 digits.');
    const others = all.filter((s) => s.id !== sim?.id);
    if (others.some((s) => s.number === number))
      return setError(`SIM Card No ${number} is already in Manage › SIM Card.`);
    if (others.some((s) => s.identifier === serial))
      return setError(`Serial Number ${serial} is already in Manage › SIM Card.`);

    const id = sim?.id ?? nextIds('CN', all, 1)[0]!;
    const active = f.status === 'Active';
    const deviceId = sim?.device_unit_id ?? null;
    const core = {
      id,
      number,
      identifier: serial,
      identifier_type: 'ICCID' as const,
      provider: f.provider,
      // core lifecycle: Inactive = Suspended; otherwise in a device = Active, else In stock
      status: (!active
        ? 'Suspended'
        : deviceId
          ? 'Active'
          : 'In stock') as ConnectivityRow['status'],
    };
    const extra = {
      connectivity_id: id,
      pin_code: txt(f.pin),
      puk_code: txt(f.puk),
      support_number: txt(f.support),
      plan: f.plan,
      purchase_date: txt(f.purchase),
      subscription_date: txt(f.subscription),
      expiry_reminder: (txt(f.reminder) as Reminder | null) ?? null,
      active,
    };
    try {
      await save.mutateAsync(
        isNew
          ? {
              upserts: [
                {
                  table: 'connectivity',
                  rows: [{ ...core, owner_dealer_id: dealer, billing: 'Bundled' }],
                },
                { table: 'sim_details', rows: [extra] },
              ],
            }
          : {
              updates: [{ table: 'connectivity', rows: [core] }],
              upserts: [{ table: 'sim_details', rows: [extra] }],
            },
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const ro = !!readOnly;
  return (
    <Drawer
      open
      onClose={onClose}
      title={isNew ? 'Add SIM' : 'Edit SIM Card'}
      subtitle={isNew ? 'Register a SIM and its connectivity plan' : 'Update sim card'}
      icon={isNew ? 'plus' : 'edit'}
      notice={
        error && (
          <Note tone="red" role="alert">
            {error}
          </Note>
        )
      }
      footer={
        ro ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <>
            <Button
              onClick={() => {
                setF(start);
                setError(null);
              }}
            >
              Reset
            </Button>
            <Button variant="primary" disabled={save.isPending} onClick={submit}>
              {save.isPending ? 'Saving…' : isNew ? 'Add SIM' : 'Save Changes'}
            </Button>
          </>
        )
      }
    >
      <FormSection id="info" title="SIM Information" icon="info">
        <TextField
          label="SIM Card No"
          required
          readOnly={ro}
          value={f.number}
          onChange={set('number')}
          placeholder="e.g. 966512345678"
        />
        <TextField
          label="Serial Number"
          required
          readOnly={ro}
          value={f.serial}
          onChange={set('serial')}
          placeholder="ICCID, 18–22 digits"
        />
        <TextField label="Pin Code" readOnly={ro} value={f.pin} onChange={set('pin')} />
        <TextField label="Puk Code" readOnly={ro} value={f.puk} onChange={set('puk')} />
        <TextField
          label="Support Number"
          readOnly={ro}
          value={f.support}
          onChange={set('support')}
          placeholder="e.g. 1800 425 1900"
        />
        <SelectField
          label="Provider"
          required
          readOnly={ro}
          action={
            ro ? undefined : (
              <FieldAction onClick={() => setAddingLookup('sim_provider')}>Add</FieldAction>
            )
          }
          value={f.provider}
          onChange={set('provider')}
          placeholder="Select provider..."
          options={withCurrent('sim_provider', f.provider)}
        />
        <SelectField
          label="Plan"
          required
          readOnly={ro}
          action={
            ro ? undefined : (
              <FieldAction onClick={() => setAddingLookup('sim_plan')}>Add</FieldAction>
            )
          }
          value={f.plan}
          onChange={set('plan')}
          placeholder="Select plan..."
          options={withCurrent('sim_plan', f.plan)}
        />
        <DateField
          label="Date of Purchase"
          readOnly={ro}
          value={f.purchase}
          onChange={set('purchase')}
        />
        <DateField
          label="Subscription Date"
          readOnly={ro}
          value={f.subscription}
          onChange={set('subscription')}
        />
        <SelectField
          label="Expiry Reminder"
          readOnly={ro}
          value={f.reminder}
          onChange={set('reminder')}
          placeholder="Select reminder..."
          options={REMINDERS.map((r) => ({ value: r, label: r }))}
        />
        <RadioGroupField
          label="Status"
          readOnly={ro}
          value={f.status}
          onChange={set('status')}
          options={[
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
          ]}
        />
      </FormSection>
      {addingLookup && (
        <AddLookupModal
          kind={addingLookup}
          existing={lookups.rows}
          onClose={() => setAddingLookup(null)}
          onAdded={(v) => set(addingLookup === 'sim_provider' ? 'provider' : 'plan')(v)}
        />
      )}
    </Drawer>
  );
}
