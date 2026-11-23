// Add SIM / Edit SIM Card drawer and the delete confirmation of the approved design
// (Desktop/vs/Manage-SIM-Card.html; first built for the Partner Portal's Stock from the GPS
// Platform design 07-03). One copy for both apps:
// - dealer use (`dealer`): the SIM goes to the dealer's stock;
// - company use (`companyId`): a company sees its SIMs through its devices, so the SIM is put in
//   one of the company's devices (IMEI No) and its dealer stays the owner.
// The SIM is a core.connectivity row: identifier (ICCID) = Serial Number, number = SIM Card No,
// provider = Provider, device_unit_id = the device it is in. The other fields are in
// proto_vehicle.sim_details. Add / Save Changes write both in one transaction.
import { useState } from 'react';
import {
  Button,
  DateField,
  Drawer,
  FieldAction,
  FormSection,
  Note,
  RadioGroupField,
  SelectField,
  TextField,
} from '@iotify/ui';
import {
  useConnectivity,
  useDeviceUnits,
  useSaveBatch,
  type ConnectivityRow,
  type SimDetailsRow,
} from '@iotify/data';
import {
  AddLookupModal,
  day,
  nextIds,
  txt,
  useLookupOptions,
  useOwnerDealer,
  withCurrent,
  type LookupKind,
  type Owner,
} from './lookups';
import { DeleteModal } from './DeleteModal';

const REMINDERS = ['1 week before', '2 weeks before', '1 month before', '2 months before'] as const;
type Reminder = (typeof REMINDERS)[number];

/** Active / Inactive as the design shows it (core "Suspended" = Inactive). */
export const simActive = (sim: ConnectivityRow, d?: SimDetailsRow) =>
  d ? d.active !== false : sim.status !== 'Suspended';

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
  status: !sim || simActive(sim, d) ? 'Active' : 'Inactive',
  device: sim?.device_unit_id ?? '',
});
type Form = ReturnType<typeof formOf>;

export interface SimCardDrawerProps extends Owner {
  /** Edit (or view) this SIM instead of adding one. */
  sim?: ConnectivityRow;
  detail?: SimDetailsRow;
  /** Open the SIM read-only first, with an Edit button. */
  viewFirst?: boolean;
  /** View only: no Edit. */
  readOnly?: boolean;
  onClose: () => void;
}

/** Add SIM (no `sim`) or Edit SIM Card. */
export function SimCardDrawer({
  dealer,
  companyId,
  sim,
  detail,
  viewFirst,
  readOnly,
  onClose,
}: SimCardDrawerProps) {
  const isNew = !sim;
  const companyUse = !dealer && !!companyId;
  const [mode, setMode] = useState<'view' | 'edit'>(
    !isNew && (viewFirst || readOnly) ? 'view' : 'edit',
  );
  const ro = mode === 'view';
  const start = formOf(sim, detail);
  const [f, setF] = useState<Form>(start);
  const [error, setError] = useState<string | null>(null);
  const [addingLookup, setAddingLookup] = useState<LookupKind | null>(null);
  const ownerDealer = useOwnerDealer({ dealer, companyId });
  const all = useConnectivity();
  const companyUnits = useDeviceUnits(
    { company_id: companyId ?? '__none' },
    { enabled: companyUse },
  );
  const lookups = useLookupOptions();
  const save = useSaveBatch();
  const set = (k: keyof Form) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  // company use: its devices without a SIM (and the one this SIM is in)
  const devices = (companyUnits.data ?? [])
    .filter(
      (u) =>
        u.id === sim?.device_unit_id ||
        !(all.data ?? []).some((s) => s.device_unit_id === u.id && s.id !== sim?.id),
    )
    .map((u) => ({ value: u.id, label: u.imei ?? u.id }));

  const submit = async () => {
    setError(null);
    const number = f.number.trim();
    const serial = f.serial.trim().replace(/\s/g, '');
    const missing = [
      !number && 'SIM Card No',
      !serial && 'Serial Number',
      !f.provider && 'Provider',
      !f.plan && 'Plan',
      companyUse && !f.device && 'IMEI No (the device it is in)',
    ].filter(Boolean);
    if (missing.length) return setError(`Fill in: ${missing.join(', ')}.`);
    if (!/^\+?[0-9]{6,15}$/.test(number))
      return setError('SIM Card No: the phone number, 6–15 digits (a leading + is allowed).');
    if (!/^[0-9]{18,22}$/.test(serial)) return setError('Serial Number: the ICCID, 18–22 digits.');
    if (f.pin.trim() && !/^[0-9]{4,8}$/.test(f.pin.trim()))
      return setError('Pin Code: 4–8 digits.');
    if (f.puk.trim() && !/^[0-9]{4,16}$/.test(f.puk.trim()))
      return setError('Puk Code: 4–16 digits.');
    if (!ownerDealer) return setError('The company’s dealer is still loading. Try again.');
    const others = (all.data ?? []).filter((s) => s.id !== sim?.id);
    if (others.some((s) => s.number === number))
      return setError(`SIM Card No ${number} is already in use.`);
    if (others.some((s) => s.identifier === serial))
      return setError(`Serial Number ${serial} is already in use.`);

    const id = sim?.id ?? nextIds('CN', all.data ?? [], 1)[0]!;
    const active = f.status === 'Active';
    const deviceId = companyUse ? f.device || null : (sim?.device_unit_id ?? null);
    const core = {
      id,
      number,
      identifier: serial,
      identifier_type: 'ICCID' as const,
      provider: f.provider,
      ...(companyUse ? { device_unit_id: deviceId } : {}),
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
                  rows: [{ ...core, owner_dealer_id: ownerDealer, billing: 'Bundled' }],
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

  return (
    <Drawer
      open
      onClose={onClose}
      title={isNew ? 'Add SIM' : ro ? sim!.number || sim!.identifier || sim!.id : 'Edit SIM Card'}
      subtitle={
        isNew
          ? 'Register a SIM and its connectivity plan'
          : ro
            ? 'SIM card details'
            : 'Update sim card'
      }
      icon={isNew ? 'plus' : ro ? 'signal' : 'edit'}
      notice={
        error && (
          <Note tone="red" role="alert">
            {error}
          </Note>
        )
      }
      footer={
        ro ? (
          <>
            <Button onClick={onClose}>Close</Button>
            {!readOnly && (
              <Button variant="primary" icon="edit" onClick={() => setMode('edit')}>
                Edit SIM Card
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              onClick={() => {
                setF(start);
                setError(null);
                if (!isNew && viewFirst) setMode('view');
              }}
            >
              {!isNew && viewFirst ? 'Cancel' : 'Reset'}
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
          placeholder={ro ? '—' : 'e.g. 966512345678'}
        />
        <TextField
          label="Serial Number"
          required
          readOnly={ro}
          value={f.serial}
          onChange={set('serial')}
          placeholder={ro ? '—' : 'ICCID, 18–22 digits'}
        />
        <TextField label="Pin Code" readOnly={ro} value={f.pin} onChange={set('pin')} />
        <TextField label="Puk Code" readOnly={ro} value={f.puk} onChange={set('puk')} />
        <TextField
          label="Support Number"
          readOnly={ro}
          value={f.support}
          onChange={set('support')}
          placeholder={ro ? '—' : 'e.g. 1800 425 1900'}
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
          placeholder={ro ? '—' : 'Select provider...'}
          options={withCurrent(lookups.options('sim_provider'), f.provider)}
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
          placeholder={ro ? '—' : 'Select plan...'}
          options={withCurrent(lookups.options('sim_plan'), f.plan)}
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
          placeholder={ro ? '—' : 'Select reminders...'}
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
        {companyUse && (
          <SelectField
            label="IMEI No"
            required
            readOnly={ro}
            value={f.device}
            onChange={set('device')}
            placeholder={
              ro
                ? '—'
                : devices.length
                  ? 'Select the device it is in...'
                  : 'No device without a SIM'
            }
            options={devices}
            hint={ro ? undefined : 'Your SIM cards are listed through the devices they are in.'}
          />
        )}
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

/** "Delete this sim card?": deletes at once after the confirmation (sim_details goes with it). */
export function DeleteSimModal({
  sim,
  onClose,
  onDeleted,
}: {
  sim: ConnectivityRow;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  return (
    <DeleteModal
      title="Delete this sim card?"
      batch={{ deletes: [{ table: 'connectivity', keys: [{ id: sim.id }] }] }}
      onClose={onClose}
      onDeleted={onDeleted}
    >
      This will permanently remove <b>{sim.number || sim.identifier}</b> from SIM inventory.
    </DeleteModal>
  );
}
