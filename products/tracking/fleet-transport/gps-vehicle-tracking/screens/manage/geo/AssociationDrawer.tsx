// Associate Geofence / Edit Association (approved design, Desktop/vs/Manage-Geo-Association.html):
// a wide drawer with the company's geofences (filters, search, tick boxes), its vehicles by group,
// the ticked zones on a street map and the settings (valid for, days, alerts, notifications).
// Saves one proto_vehicle.vehicle_geofences row per (vehicle, zone) in one transaction.
import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  CheckTree,
  CheckboxField,
  Chip,
  DateField,
  Drawer,
  Field,
  Legend,
  MultiSelectField,
  Note,
  PillSelect,
  SearchInput,
  SelectField,
  Stack,
  StreetMap,
  useToast,
  type CheckTreeGroup,
  type MapFence,
} from '@iotify/ui';
import { useSaveBatch, type GeofencesRow, type VehicleGeofencesRow } from '@iotify/data';
import type { FleetVehicle } from '../../../demo/fleet';
import { ZONE_HUE, type ZoneType } from '../../../shared/vehicle-status';
import {
  VALID_FOR,
  WEEK,
  WORK_DAYS,
  ZONE_TYPES,
  rowShape,
  todayIso,
  validTill,
  type Shape,
  type ValidFor,
} from './geo';

interface Settings {
  validFor: ValidFor;
  until: string;
  days: string[];
  onEnter: boolean;
  onLeave: boolean;
  push: boolean;
  sms: boolean;
  email: boolean;
}
const DEFAULTS: Settings = {
  validFor: 'forever',
  until: '',
  days: WORK_DAYS,
  onEnter: true,
  onLeave: true,
  push: true,
  sms: false,
  email: false,
};
const settingsOf = (l: VehicleGeofencesRow): Settings => ({
  validFor: l.valid_till ? 'custom' : 'forever',
  until: l.valid_till ? l.valid_till.slice(0, 10) : '',
  days: WEEK.filter((d) => l.days?.includes(d)),
  onEnter: l.on_enter !== false,
  onLeave: l.on_leave !== false,
  push: l.notify_push !== false,
  sms: !!l.notify_sms,
  email: !!l.notify_email,
});

const shapeOf = (r: GeofencesRow): Shape => (r.shape === 'Circle' ? 'Circle' : 'Freeform');
const typeOf = (r: GeofencesRow): ZoneType => (r.zone_type ?? 'General') as ZoneType;
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
const COL_HEIGHT = 'max(440px, calc(100vh - 190px))';

/** The ticked zones on a map, with a legend. */
function ZonesMap({ zones, empty }: { zones: GeofencesRow[]; empty: string }) {
  const fences = zones.map(rowShape).filter((f): f is MapFence => !!f);
  return (
    <Card
      icon="layers"
      title="Selected Geofences"
      actions={<Chip>{plural(fences.length, 'geofence')} plotted</Chip>}
    >
      <StreetMap
        label={`Map of ${plural(fences.length, 'selected geofence')}`}
        fences={fences}
        fitKey={zones.map((z) => z.id).join(',')}
        height={300}
        footer={!fences.length ? <Chip>{empty}</Chip> : undefined}
      />
      {fences.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <Legend items={zones.map((z) => ({ label: z.name, hue: ZONE_HUE[typeOf(z)] }))} />
        </div>
      )}
    </Card>
  );
}

export function AssociationDrawer({
  link,
  zones,
  vehicles,
  existing,
  onClose,
  onSaved,
}: {
  /** The association being edited, or null to associate new ones. */
  link: VehicleGeofencesRow | null;
  zones: GeofencesRow[];
  vehicles: FleetVehicle[];
  /** Associations already saved (to say which pairs get new settings). */
  existing: VehicleGeofencesRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const save = useSaveBatch();
  const toast = useToast();
  const [cfg, setCfg] = useState<Settings>(() => (link ? settingsOf(link) : DEFAULTS));
  const [zoneIds, setZoneIds] = useState<Set<string>>(new Set());
  const [vehicleIds, setVehicleIds] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [shapeF, setShapeF] = useState<'all' | Shape>('all');
  const [typeF, setTypeF] = useState<'all' | ZoneType>('all');
  const [statusF, setStatusF] = useState<'all' | 'active' | 'inactive'>('all');
  const [tried, setTried] = useState(false);
  const set = (p: Partial<Settings>) => setCfg((c) => ({ ...c, ...p }));
  const today = todayIso(new Date());

  const zone = link ? zones.find((z) => z.id === link.geofence_id) : undefined;
  const vehicle = link ? vehicles.find((v) => v.id === link.asset_id) : undefined;

  const s = q.trim().toLowerCase();
  const shownZones = zones.filter(
    (z) =>
      (!s || z.name.toLowerCase().includes(s)) &&
      (shapeF === 'all' || shapeOf(z) === shapeF) &&
      (typeF === 'all' || typeOf(z) === typeF) &&
      (statusF === 'all' || (statusF === 'active') === (z.active !== false)),
  );
  const groups = useMemo<CheckTreeGroup[]>(() => {
    const by = new Map<string, FleetVehicle[]>();
    for (const v of vehicles)
      by.set(v.group ?? 'No group', [...(by.get(v.group ?? 'No group') ?? []), v]);
    return [...by.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([g, vs]) => ({
        key: g,
        label: g,
        items: [...vs]
          .sort((a, b) => a.plate.localeCompare(b.plate, 'en', { numeric: true }))
          .map((v) => ({ key: v.id, label: v.plate, detail: v.callSign })),
      }));
  }, [vehicles]);

  const plotted = link ? (zone ? [zone] : []) : zones.filter((z) => zoneIds.has(z.id));
  const pairs = link ? 1 : zoneIds.size * vehicleIds.size;
  const already = link
    ? 0
    : existing.filter((e) => zoneIds.has(e.geofence_id) && vehicleIds.has(e.asset_id)).length;

  const problems = [
    !link && !zoneIds.size && 'Tick at least one geofence.',
    !link && !vehicleIds.size && 'Tick at least one vehicle.',
    !cfg.days.length && 'Pick at least one day.',
    cfg.validFor === 'custom' && !cfg.until && 'Pick the last valid date.',
  ].filter((x): x is string => !!x);

  const submit = () => {
    setTried(true);
    if (problems.length) return;
    const settings = {
      valid_till: validTill(cfg.validFor, cfg.until, new Date()),
      days: cfg.days,
      on_enter: cfg.onEnter,
      on_leave: cfg.onLeave,
      notify_push: cfg.push,
      notify_sms: cfg.sms,
      notify_email: cfg.email,
    };
    const rows: Partial<VehicleGeofencesRow>[] = link
      ? [{ asset_id: link.asset_id, geofence_id: link.geofence_id, ...settings }]
      : [...vehicleIds].flatMap((asset_id) =>
          [...zoneIds].map((geofence_id) => ({ asset_id, geofence_id, ...settings })),
        );
    save.mutate(
      link
        ? { updates: [{ table: 'vehicle_geofences', rows }] }
        : { upserts: [{ table: 'vehicle_geofences', rows }] },
      {
        onSuccess: () => {
          toast(link ? 'Association saved' : `${plural(rows.length, 'association')} saved`);
          onSaved();
        },
      },
    );
  };

  const reset = () => {
    setCfg(link ? settingsOf(link) : DEFAULTS);
    setZoneIds(new Set());
    setVehicleIds(new Set());
    setTried(false);
    save.reset();
  };

  const notice = save.error ? (
    <Note tone="red">Not saved: {save.error.message}</Note>
  ) : tried && problems.length ? (
    <Note tone="amber">{problems.join(' ')}</Note>
  ) : null;

  const config = (
    <Card icon="sliders" title="Configuration">
      <Stack dir="col" align="stretch" gap={10}>
        <Stack align="start" gap={10}>
          <div style={{ flex: '1 1 160px' }}>
            <SelectField
              label="Valid For"
              value={cfg.validFor}
              onChange={(v) => set({ validFor: v as ValidFor })}
              options={VALID_FOR}
            />
          </div>
          {cfg.validFor === 'custom' && (
            <div style={{ flex: '1 1 160px' }}>
              <DateField
                label="Valid Till"
                value={cfg.until}
                min={today}
                onChange={(v) => set({ until: v })}
              />
            </div>
          )}
        </Stack>
        <MultiSelectField
          label="Days"
          value={cfg.days}
          onChange={(v) => set({ days: v })}
          options={WEEK.map((d) => ({ value: d, label: d }))}
          allLabel="Every day"
          placeholder="No days"
        />
        <Field label="Alert">
          <Stack gap={14}>
            <CheckboxField
              label="On Enter"
              checked={cfg.onEnter}
              onChange={(v) => set({ onEnter: v })}
            />
            <CheckboxField
              label="On Leave"
              checked={cfg.onLeave}
              onChange={(v) => set({ onLeave: v })}
            />
          </Stack>
        </Field>
        <Field label="Notifications">
          <Stack gap={14}>
            <CheckboxField label="Push" checked={cfg.push} onChange={(v) => set({ push: v })} />
            <CheckboxField label="SMS" checked={cfg.sms} onChange={(v) => set({ sms: v })} />
            <CheckboxField label="Email" checked={cfg.email} onChange={(v) => set({ email: v })} />
          </Stack>
        </Field>
        {!link && pairs > 0 && (
          <Chip>
            Saves {plural(pairs, 'association')}
            {already ? ` (${already} already exist and get these settings)` : ''}
          </Chip>
        )}
      </Stack>
    </Card>
  );

  return (
    <Drawer
      open
      onClose={onClose}
      width={1000}
      icon={link ? 'edit' : 'plus'}
      title={link ? 'Edit Association' : 'Associate Geofence'}
      subtitle={
        link
          ? `${vehicle?.plate ?? link.asset_id} · ${zone?.name ?? link.geofence_id}`
          : 'Associate vehicles with existing geofences and configure their zone settings'
      }
      notice={notice}
      footer={
        <>
          <Button onClick={reset}>Reset</Button>
          <Button variant="primary" onClick={submit} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : link ? 'Save Changes' : 'Save Association'}
          </Button>
        </>
      }
    >
      <Stack align="stretch" gap={10}>
        {link ? (
          <div style={{ flex: '1 1 300px' }}>
            <Card icon="layers" title="Association">
              <Stack dir="col" align="stretch" gap={10}>
                <Field label="Plate No">
                  <b>{vehicle?.plate ?? link.asset_id}</b>
                </Field>
                <Field label="Geozone">
                  <b>{zone?.name ?? link.geofence_id}</b>
                </Field>
                <Field label="Zone Type">
                  <b>{zone ? typeOf(zone) : '—'}</b>
                </Field>
              </Stack>
            </Card>
          </div>
        ) : (
          <>
            <Card
              icon="geofence"
              title="Geofences"
              actions={<Chip>{zoneIds.size} selected</Chip>}
              style={{ flex: '1 1 250px', minWidth: 0, height: COL_HEIGHT, overflowY: 'auto' }}
            >
              <Stack dir="col" align="stretch" gap={10}>
                <Stack gap={6}>
                  <PillSelect
                    label="Shape"
                    value={shapeF}
                    onChange={setShapeF}
                    options={[
                      { value: 'all', label: 'All Shapes' },
                      { value: 'Circle', label: 'Circle' },
                      { value: 'Freeform', label: 'Freeform' },
                    ]}
                  />
                  <PillSelect
                    label="Zone type"
                    value={typeF}
                    onChange={setTypeF}
                    options={[
                      { value: 'all', label: 'All Types' },
                      ...ZONE_TYPES.map((t) => ({ value: t, label: t })),
                    ]}
                  />
                  <PillSelect
                    label="Status"
                    value={statusF}
                    onChange={setStatusF}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                  />
                </Stack>
                <SearchInput value={q} onChange={setQ} placeholder="Search zone…" />
                <Stack dir="col" align="stretch" gap={4}>
                  {shownZones.map((z) => (
                    <CheckboxField
                      key={z.id}
                      label={z.name}
                      checked={zoneIds.has(z.id)}
                      onChange={(on) => {
                        const next = new Set(zoneIds);
                        if (on) next.add(z.id);
                        else next.delete(z.id);
                        setZoneIds(next);
                      }}
                    />
                  ))}
                  {!shownZones.length && (
                    <Chip>{zones.length ? 'No zone matches.' : 'No geofences yet.'}</Chip>
                  )}
                </Stack>
              </Stack>
            </Card>
            <Card
              icon="vehicles"
              title="Vehicles"
              actions={<Chip>{vehicleIds.size} selected</Chip>}
              style={{
                flex: '1 1 230px',
                minWidth: 200,
                height: COL_HEIGHT,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <CheckTree
                label="Vehicles"
                groups={groups}
                selected={vehicleIds}
                onChange={setVehicleIds}
                searchPlaceholder="Search plate or group…"
              />
            </Card>
          </>
        )}
        <Stack dir="col" align="stretch" gap={10} style={{ flex: '1.5 1 360px', minWidth: 0 }}>
          <ZonesMap zones={plotted} empty="No geofence selected · pick zones to plot them" />
          {config}
        </Stack>
      </Stack>
    </Drawer>
  );
}
