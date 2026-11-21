// Add Device: approved GPS Platform design 07-02 (D:/Project/GPS_Platform/approved_degin).
// The device is a core.device_units row (model, IMEI, in the dealer's stock); the other fields
// go to proto_vehicle.device_details. Additional devices are saved with it, linked to it.
// Everything is saved in one transaction when "Add Device" is pressed.
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
  Note,
  RadioGroupField,
  SelectField,
  TextField,
} from '@iotify/ui';
import {
  useConnectivity,
  useDeviceModels,
  useDeviceUnits,
  useSaveBatch,
  type Batch,
} from '@iotify/data';
import { nextIds, txt } from './shared';

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

export function AddDeviceDrawer({
  dealer,
  onClose,
  onSaved,
}: {
  dealer: string;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const models = useDeviceModels();
  const units = useDeviceUnits();
  const sims = useConnectivity({ owner_dealer_id: dealer });
  const save = useSaveBatch();
  const [f, setF] = useState(empty);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [newSim, setNewSim] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof empty) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  // only hardware fitted on an asset (gateways and site readers are added under Sites)
  const onAsset = (models.data ?? []).filter((m) => m.placement !== 'Site infrastructure');
  const makers = [...new Set(onAsset.map((m) => m.maker ?? ''))].filter(Boolean).sort();
  const modelsOf = (maker: string) =>
    onAsset.filter((m) => m.maker === maker).map((m) => ({ value: m.id, label: m.model ?? m.id }));
  const freeSims = (sims.data ?? []).filter((s) => !s.device_unit_id);

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
    const imeis = [f.imei, ...extras.map((x) => x.imei)].map((s) => s.trim());
    const taken = imeis.find(
      (i, n) => imeis.indexOf(i) !== n || (units.data ?? []).some((u) => u.imei === i),
    );
    if (taken) return setError(`IMEI ${taken} is already in use. Each device needs its own IMEI.`);

    const [id, ...extraIds] = nextIds('DU', units.data ?? [], 1 + extras.length) as [
      string,
      ...string[],
    ];
    const batch: Batch = {
      upserts: [
        {
          table: 'device_units',
          rows: [
            {
              id,
              device_model_id: f.model,
              imei: f.imei.trim(),
              owner_dealer_id: dealer,
              status: 'In stock',
            },
            ...extras.map((x, i) => ({
              id: extraIds[i]!,
              device_model_id: x.model,
              imei: x.imei.trim(),
              owner_dealer_id: dealer,
              status: 'In stock' as const,
            })),
          ],
        },
        {
          table: 'device_details',
          rows: [
            {
              device_unit_id: id,
              device_type: f.deviceType as 'Primary Device',
              device_name: f.name.trim(),
              serial_number: txt(f.serial),
              purchase_date: txt(f.purchase),
              warranty_expiry: txt(f.warranty),
              extended_warranty: txt(f.extended),
              expiry_reminder: (txt(f.reminder) as '7 days before' | null) ?? null,
              active: f.status === 'Active',
            },
            ...extras.map((x, i) => ({
              device_unit_id: extraIds[i]!,
              device_type: 'Additional Device' as const,
              primary_unit_id: id,
              device_name: `${f.name.trim()} · additional ${i + 1}`,
              serial_number: txt(x.serial),
              active: f.status === 'Active',
            })),
          ],
        },
      ],
    };
    if (newSim !== null) {
      const [simId] = nextIds('CN', sims.data ?? [], 1);
      batch.upserts!.push({
        table: 'connectivity',
        rows: [
          {
            id: simId!,
            identifier: newSim.trim(),
            identifier_type: 'ICCID',
            owner_dealer_id: dealer,
            device_unit_id: id,
            billing: 'Bundled',
            status: 'Active',
          },
        ],
      });
    } else if (f.sim) {
      batch.updates = [
        { table: 'connectivity', rows: [{ id: f.sim, device_unit_id: id, status: 'Active' }] },
      ];
    }
    try {
      await save.mutateAsync(batch);
      onSaved?.(id);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="Add Device"
      subtitle="Add and configure a device"
      icon="plus"
      notice={
        error && (
          <Note tone="red" role="alert">
            {error}
          </Note>
        )
      }
      footer={
        <>
          <Button
            onClick={() => {
              setF(empty);
              setExtras([]);
              setNewSim(null);
              setError(null);
            }}
          >
            Reset
          </Button>
          <Button variant="primary" disabled={save.isPending} onClick={submit}>
            {save.isPending ? 'Adding…' : 'Add Device'}
          </Button>
        </>
      }
    >
      <FormSection id="info" title="Device Information" icon="info">
        <SelectField
          label="Device Type"
          required
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
          value={f.name}
          onChange={set('name')}
          placeholder="e.g. Truck 12 Tracker"
        />
        <TextField label="IMEI No" required value={f.imei} onChange={set('imei')} />
        <TextField
          label="Serial Number"
          value={f.serial}
          onChange={set('serial')}
          placeholder="—"
        />
        {newSim === null ? (
          <SelectField
            label="SIM Card Number"
            action={<FieldAction onClick={() => setNewSim('')}>Add</FieldAction>}
            value={f.sim}
            onChange={set('sim')}
            placeholder="Select SIM number..."
            options={freeSims.map((s) => ({ value: s.id, label: s.identifier ?? s.id }))}
          />
        ) : (
          <TextField
            label="New SIM Card Number"
            required
            action={<FieldAction onClick={() => setNewSim(null)}>Pick from stock</FieldAction>}
            value={newSim}
            onChange={setNewSim}
            placeholder="ICCID"
          />
        )}
        <SelectField
          label="Manufacturer Name"
          required
          value={f.maker}
          onChange={(v) => setF((p) => ({ ...p, maker: v, model: '' }))}
          placeholder="Select manufacturer..."
          options={makers.map((m) => ({ value: m, label: m }))}
        />
        <SelectField
          label="Model"
          required
          value={f.model}
          onChange={set('model')}
          placeholder={f.maker ? 'Select model...' : 'Pick the manufacturer first'}
          options={modelsOf(f.maker)}
        />
        <DateField label="Date of Purchase" value={f.purchase} onChange={set('purchase')} />
        <DateField label="Warranty Expiry Date" value={f.warranty} onChange={set('warranty')} />
        <DateField label="Extended Warranty Date" value={f.extended} onChange={set('extended')} />
        <SelectField
          label="Expiry Reminder"
          value={f.reminder}
          onChange={set('reminder')}
          placeholder="Select reminder..."
          options={REMINDERS.map((r) => ({ value: r, label: r }))}
        />
        <RadioGroupField
          label="Status"
          value={f.status}
          onChange={set('status')}
          options={[
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
          ]}
        />
      </FormSection>

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
                placeholder="Select manufacturer..."
                options={makers.map((m) => ({ value: m, label: m }))}
              />
              <SelectField
                label="Model"
                required
                value={x.model}
                onChange={setX('model')}
                placeholder="Select model..."
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
    </Drawer>
  );
}
