// Add / Edit Device drawer of the approved design (Desktop/vs/Manage-Device.html; first built for
// the Partner Portal's Stock from the GPS Platform design 07-02). One copy for both apps:
// - dealer use (`dealer`): new units go to the dealer's stock; SIMs from the dealer's stock;
// - company use (`companyId`): new units belong to the company (its dealer stays the owner).
// The device is a core.device_units row (model, IMEI); the other fields go to
// proto_vehicle.device_details. Additional devices are saved with it, linked to it. The SIM in it
// is core.connectivity.device_unit_id. Everything is saved in one transaction.
import { useState } from 'react';
import {
  Button,
  DateField,
  Drawer,
  FieldAction,
  FormSection,
  FormSubhead,
  FullRow,
  IconButton,
  Loading,
  Note,
  RadioGroupField,
  SelectField,
  TextField,
} from '@iotify/ui';
import {
  useConnectivity,
  useDeviceDetails,
  useDeviceModels,
  useDeviceUnits,
  useSaveBatch,
  type Batch,
  type ConnectivityRow,
  type DeviceDetailsRow,
  type DeviceUnitsRow,
} from '@iotify/data';
import { day, nextIds, str, txt, useOwnerDealer, type Owner } from './lookups';

const REMINDERS = ['7 days before', '15 days before', '30 days before', '60 days before'];

interface Extra {
  maker: string;
  model: string;
  imei: string;
  serial: string;
}
const emptyExtra = (): Extra => ({ maker: '', model: '', imei: '', serial: '' });

const empty = {
  deviceType: 'Primary Device',
  name: '',
  imei: '',
  serial: '',
  sim: '',
  maker: '',
  model: '',
  purchase: '',
  warranty: '',
  extended: '',
  reminder: '',
  status: 'Active',
};
type Form = typeof empty;

export interface AddDeviceDrawerProps extends Owner {
  /** Edit (or view) this device instead of adding one. */
  unit?: DeviceUnitsRow;
  /** Open the device read-only first, with an Edit button. */
  viewFirst?: boolean;
  /** View only: no Edit. */
  readOnly?: boolean;
  onClose: () => void;
  onSaved?: (id: string) => void;
}

/** Waits for the device's saved rows (edit), then shows the form. */
export function AddDeviceDrawer(props: AddDeviceDrawerProps) {
  const id = props.unit?.id;
  const details = useDeviceDetails(id ? { device_unit_id: id } : undefined, { enabled: !!id });
  const sims = useConnectivity(id ? { device_unit_id: id } : undefined, { enabled: !!id });
  const models = useDeviceModels();
  if (id && (!details.data || !sims.data || !models.data))
    return (
      <Drawer open onClose={props.onClose} title="Device" subtitle="Loading…" icon="edit">
        <Loading>Loading device…</Loading>
      </Drawer>
    );
  const u = props.unit;
  const d: DeviceDetailsRow | undefined = details.data?.[0];
  const initial: Form = u
    ? {
        deviceType: d?.device_type ?? 'Primary Device',
        name: str(d?.device_name),
        imei: str(u.imei),
        serial: str(d?.serial_number),
        sim: sims.data?.[0]?.id ?? '',
        maker: models.data?.find((m) => m.id === u.device_model_id)?.maker ?? '',
        model: str(u.device_model_id),
        purchase: day(d?.purchase_date),
        warranty: day(d?.warranty_expiry),
        extended: day(d?.extended_warranty),
        reminder: str(d?.expiry_reminder),
        status: d?.active === false ? 'Inactive' : 'Active',
      }
    : empty;
  return <DeviceForm {...props} initial={initial} currentSim={sims.data?.[0]} />;
}

function DeviceForm({
  dealer,
  companyId,
  unit,
  viewFirst,
  readOnly,
  onClose,
  onSaved,
  initial,
  currentSim,
}: AddDeviceDrawerProps & { initial: Form; currentSim?: ConnectivityRow }) {
  const editing = !!unit;
  const [mode, setMode] = useState<'view' | 'edit'>(
    editing && (viewFirst || readOnly) ? 'view' : 'edit',
  );
  const ro = mode === 'view';
  const ownerDealer = useOwnerDealer({ dealer, companyId });
  const models = useDeviceModels();
  const units = useDeviceUnits();
  // every SIM, for new ids; the free ones are the dealer's (company use: none to pick from)
  const allSims = useConnectivity();
  const save = useSaveBatch();
  const [f, setF] = useState<Form>(initial);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [newSim, setNewSim] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof Form) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  // only hardware fitted on an asset (gateways and site readers are added under Sites)
  const onAsset = (models.data ?? []).filter((m) => m.placement !== 'Site infrastructure');
  const makers = [...new Set(onAsset.map((m) => m.maker ?? ''))].filter(Boolean).sort();
  const modelsOf = (maker: string) =>
    onAsset.filter((m) => m.maker === maker).map((m) => ({ value: m.id, label: m.model ?? m.id }));
  const freeSims = (allSims.data ?? []).filter(
    (s) =>
      (dealer ? s.owner_dealer_id === dealer && !s.device_unit_id : false) ||
      s.id === currentSim?.id,
  );

  const reset = () => {
    setF(initial);
    setExtras([]);
    setNewSim(null);
    setError(null);
  };

  const submit = async () => {
    setError(null);
    const missing = [
      !f.name.trim() && 'Device Name',
      !f.imei.trim() && 'IMEI No',
      !f.maker && 'Manufacturer Name',
      !f.model && 'Model',
      newSim !== null && !newSim.trim() && 'new SIM card number',
      extras.some((x) => !x.model || !x.imei.trim()) && 'model and IMEI of each additional device',
    ].filter(Boolean);
    if (missing.length) return setError(`Fill in: ${missing.join(', ')}.`);
    if (!ownerDealer) return setError('The company’s dealer is still loading. Try again.');
    const imeis = [f.imei, ...extras.map((x) => x.imei)].map((s) => s.trim());
    const taken = imeis.find(
      (i, n) =>
        imeis.indexOf(i) !== n || (units.data ?? []).some((u) => u.imei === i && u.id !== unit?.id),
    );
    if (taken) return setError(`IMEI ${taken} is already in use. Each device needs its own IMEI.`);

    const [newId, ...extraIds] = nextIds('DU', units.data ?? [], (editing ? 0 : 1) + extras.length);
    const id = unit?.id ?? newId!;
    const active = f.status === 'Active';
    const detail: Partial<DeviceDetailsRow> = {
      device_unit_id: id,
      device_type: f.deviceType as 'Primary Device',
      device_name: f.name.trim(),
      serial_number: txt(f.serial),
      purchase_date: txt(f.purchase),
      warranty_expiry: txt(f.warranty),
      extended_warranty: txt(f.extended),
      expiry_reminder: (txt(f.reminder) as '7 days before' | null) ?? null,
      active,
    };
    const stock = {
      owner_dealer_id: ownerDealer,
      company_id: companyId ?? null,
      status: 'In stock' as const,
    };
    const batch: Batch = { upserts: [], updates: [], deletes: [] };
    if (editing)
      batch.updates!.push({
        table: 'device_units',
        rows: [{ id, device_model_id: f.model, imei: f.imei.trim() }],
      });
    else
      batch.upserts!.push({
        table: 'device_units',
        rows: [
          { id, device_model_id: f.model, imei: f.imei.trim(), ...stock },
          ...extras.map((x, i) => ({
            id: extraIds[i]!,
            device_model_id: x.model,
            imei: x.imei.trim(),
            ...stock,
          })),
        ],
      });
    batch.upserts!.push({
      table: 'device_details',
      rows: [
        detail,
        ...extras.map((x, i) => ({
          device_unit_id: extraIds[i]!,
          device_type: 'Additional Device' as const,
          primary_unit_id: id,
          device_name: `${f.name.trim()} · additional ${i + 1}`,
          serial_number: txt(x.serial),
          active,
        })),
      ],
    });
    // SIM: a new one in this device, or a SIM from stock; the one taken out goes back to stock
    const oldSim = currentSim?.id ?? '';
    const nextSim = newSim !== null ? '__new' : f.sim;
    if (oldSim && oldSim !== nextSim)
      batch.updates!.push({
        table: 'connectivity',
        rows: [{ id: oldSim, device_unit_id: null, status: 'In stock' }],
      });
    if (newSim !== null) {
      const [simId] = nextIds('CN', allSims.data ?? [], 1);
      batch.upserts!.push({
        table: 'connectivity',
        rows: [
          {
            id: simId!,
            identifier: newSim.trim(),
            identifier_type: 'ICCID',
            owner_dealer_id: ownerDealer,
            device_unit_id: id,
            billing: 'Bundled',
            status: 'Active',
          },
        ],
      });
    } else if (f.sim && f.sim !== oldSim) {
      batch.updates!.push({
        table: 'connectivity',
        rows: [{ id: f.sim, device_unit_id: id, status: 'Active' }],
      });
    }
    try {
      await save.mutateAsync(batch);
      onSaved?.(id);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const title = !editing
    ? 'Add Device'
    : ro
      ? initial.name || unit!.imei || unit!.id
      : 'Edit Device';
  return (
    <Drawer
      open
      onClose={onClose}
      title={title}
      subtitle={
        !editing ? 'Add and configure a device' : ro ? `IMEI ${unit!.imei ?? '—'}` : 'Update device'
      }
      icon={editing ? (ro ? 'chip' : 'edit') : 'plus'}
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
                Edit Device
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              onClick={() => {
                reset();
                if (editing && viewFirst) setMode('view');
              }}
            >
              {editing && viewFirst ? 'Cancel' : 'Reset'}
            </Button>
            <Button variant="primary" disabled={save.isPending} onClick={submit}>
              {save.isPending ? 'Saving…' : editing ? 'Save Device' : 'Add Device'}
            </Button>
          </>
        )
      }
    >
      <FormSection id="info" title="Device Information" icon="info">
        <SelectField
          label="Device Type"
          required
          readOnly={ro}
          value={f.deviceType}
          onChange={set('deviceType')}
          options={[
            { value: 'Primary Device', label: 'Primary Device' },
            { value: 'Additional Device', label: 'Additional Device' },
          ]}
        />
        <TextField
          label="Device Name"
          required
          readOnly={ro}
          value={f.name}
          onChange={set('name')}
          placeholder={ro ? '—' : 'e.g. Truck 12 Tracker'}
        />
        <TextField label="IMEI No" required readOnly={ro} value={f.imei} onChange={set('imei')} />
        <TextField
          label="Serial Number"
          readOnly={ro}
          value={f.serial}
          onChange={set('serial')}
          placeholder={ro ? '—' : '—'}
        />
        {newSim === null ? (
          <SelectField
            label="SIM Card Number"
            readOnly={ro}
            action={ro ? undefined : <FieldAction onClick={() => setNewSim('')}>Add</FieldAction>}
            value={f.sim}
            onChange={set('sim')}
            placeholder={
              ro
                ? '—'
                : freeSims.length
                  ? 'Select SIM number...'
                  : dealer
                    ? 'No free SIM in stock'
                    : 'None: use + Add for a new SIM'
            }
            options={freeSims.map((s) => ({
              value: s.id,
              label: s.number || s.identifier || s.id,
            }))}
          />
        ) : (
          <TextField
            label="New SIM Card Number"
            required
            action={
              <FieldAction onClick={() => setNewSim(null)}>
                {dealer ? 'Pick from stock' : 'Cancel'}
              </FieldAction>
            }
            value={newSim}
            onChange={setNewSim}
            placeholder={ro ? '—' : 'ICCID'}
            hint={dealer ? undefined : 'Add its number, provider and plan under SIM Card.'}
          />
        )}
        <SelectField
          label="Manufacturer Name"
          required
          readOnly={ro}
          value={f.maker}
          onChange={(v) => setF((p) => ({ ...p, maker: v, model: '' }))}
          placeholder={ro ? '—' : 'Select manufacturer...'}
          options={makers.map((m) => ({ value: m, label: m }))}
        />
        <SelectField
          label="Model"
          required
          readOnly={ro}
          value={f.model}
          onChange={set('model')}
          placeholder={ro ? '—' : f.maker ? 'Select model...' : 'Pick the manufacturer first'}
          options={modelsOf(f.maker)}
        />
        <DateField
          label="Date of Purchase"
          readOnly={ro}
          value={f.purchase}
          onChange={set('purchase')}
        />
        <DateField
          label="Warranty Expiry Date"
          readOnly={ro}
          value={f.warranty}
          onChange={set('warranty')}
        />
        <DateField
          label="Extended Warranty Date"
          readOnly={ro}
          value={f.extended}
          onChange={set('extended')}
        />
        <SelectField
          label="Expiry Reminder"
          readOnly={ro}
          value={f.reminder}
          onChange={set('reminder')}
          placeholder={ro ? '—' : 'Select reminder...'}
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

      {!editing && (
        <FormSection id="extra" title="Additional Device" icon="chip">
          {extras.map((x, i) => {
            const setX = (k: keyof Extra) => (v: string) =>
              setExtras((p) =>
                p.map((y, n) =>
                  n === i ? { ...y, [k]: v, ...(k === 'maker' ? { model: '' } : {}) } : y,
                ),
              );
            return (
              <div key={i} style={{ display: 'contents' }}>
                <FormSubhead
                  actions={
                    <IconButton
                      icon="trash"
                      label={`Remove additional device ${i + 1}`}
                      onClick={() => setExtras((p) => p.filter((_, n) => n !== i))}
                    />
                  }
                >
                  Additional device {i + 1}
                </FormSubhead>
                <SelectField
                  label="Manufacturer Name"
                  required
                  value={x.maker}
                  onChange={setX('maker')}
                  placeholder={ro ? '—' : 'Select manufacturer...'}
                  options={makers.map((m) => ({ value: m, label: m }))}
                />
                <SelectField
                  label="Model"
                  required
                  value={x.model}
                  onChange={setX('model')}
                  placeholder={ro ? '—' : 'Select model...'}
                  options={modelsOf(x.maker)}
                />
                <TextField label="IMEI No" required value={x.imei} onChange={setX('imei')} />
                <TextField label="Serial Number" value={x.serial} onChange={setX('serial')} />
              </div>
            );
          })}
          <FullRow>
            <Button
              variant="primary"
              icon="plus"
              onClick={() => setExtras((p) => [...p, emptyExtra()])}
            >
              Add Device
            </Button>
          </FullRow>
        </FormSection>
      )}
    </Drawer>
  );
}
