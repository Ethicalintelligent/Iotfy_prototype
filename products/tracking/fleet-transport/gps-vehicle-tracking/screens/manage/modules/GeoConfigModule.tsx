// Manage > Geo Configuration (approved design, Desktop/vs/Manage-Geo-Configuration.html): zone
// counts, the company's geofences as cards (filters by shape, type and status) and the chosen
// zone on a street map with its speed and height limits and time intervals. Add / Edit open the
// zone drawer; Delete asks first. Real data: proto_vehicle.geofences and vehicle_geofences.
import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Chip,
  Dropdown,
  DropdownItem,
  EmptyState,
  HueChip,
  IconButton,
  IconTile,
  ListCard,
  Loading,
  Modal,
  Note,
  PillSelect,
  Stack,
  StatusTile,
  StatusTileRow,
  StreetMap,
  ToolButton,
  useToast,
  type MapFence,
} from '@iotify/ui';
import {
  useGeofences,
  useSaveBatch,
  useVehicleGeofences,
  type Filter,
  type GeofencesRow,
} from '@iotify/data';
import { ZONE_HUE, type ZoneType } from '../../../shared/vehicle-status';
import { ManageToolbar } from '../ManageToolbar';
import type { ModuleProps } from '../modules';
import {
  SHAPE_HUE,
  SHAPE_ICON,
  ZONE_ICON,
  ZONE_TYPES,
  intervalText,
  intervalsOf,
  rowShape,
  type Interval,
  type Shape,
} from '../geo/geo';
import { ZoneDrawer } from '../geo/ZoneDrawer';

type StatusF = 'all' | 'active' | 'inactive';
const byName = (a: GeofencesRow, b: GeofencesRow) =>
  a.name.localeCompare(b.name, 'en', { numeric: true });
const shapeOf = (r: GeofencesRow): Shape => (r.shape === 'Circle' ? 'Circle' : 'Freeform');
const typeOf = (r: GeofencesRow): ZoneType => (r.zone_type ?? 'General') as ZoneType;
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** "Time Intervals · 1 ▾": the zone's intervals in a small menu. */
function IntervalsMenu({ intervals }: { intervals: Interval[] }) {
  const [el, setEl] = useState<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <span ref={setEl}>
      <ToolButton icon="clock" onClick={() => setOpen(!open)} active={open}>
        Time Intervals · {intervals.length}
      </ToolButton>
      <Dropdown
        anchor={el}
        open={open}
        onClose={() => setOpen(false)}
        align="right"
        width={230}
        label="Time intervals"
      >
        {intervals.length ? (
          intervals.map((i, k) => (
            <DropdownItem key={k} icon="clock" onClick={() => setOpen(false)}>
              {intervalText(i)}
            </DropdownItem>
          ))
        ) : (
          <DropdownItem icon="info" onClick={() => setOpen(false)}>
            None: the zone applies all day
          </DropdownItem>
        )}
      </Dropdown>
    </span>
  );
}

export default function GeoConfigModule({ picker, companyId, readOnly }: ModuleProps) {
  const on = { enabled: !!companyId };
  const zones = useGeofences({ company_id: companyId }, on);
  const allZones = useGeofences(undefined, on);
  const links = useVehicleGeofences(undefined, on);
  const del = useSaveBatch();
  const toast = useToast();

  const [q, setQ] = useState('');
  const [shapeF, setShapeF] = useState<'all' | Shape>('all');
  const [typeF, setTypeF] = useState<'all' | ZoneType>('all');
  const [statusF, setStatusF] = useState<StatusF>('all');
  const [picked, setPicked] = useState<string | null>(null);
  const [form, setForm] = useState<{ row: GeofencesRow | null; n: number } | null>(null);
  const [deleting, setDeleting] = useState<GeofencesRow | null>(null);

  const rows = useMemo(() => [...(zones.data ?? [])].sort(byName), [zones.data]);
  const linkCount = (id: string) => (links.data ?? []).filter((l) => l.geofence_id === id).length;

  const s = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (!s || `${r.name} ${shapeOf(r)} ${typeOf(r)}`.toLowerCase().includes(s)) &&
      (shapeF === 'all' || shapeOf(r) === shapeF) &&
      (typeF === 'all' || typeOf(r) === typeF) &&
      (statusF === 'all' || (statusF === 'active') === (r.active !== false)),
  );
  const sel = shown.find((r) => r.id === picked) ?? shown[0] ?? null;
  const selShape = sel ? rowShape(sel) : null;

  const context = useMemo<MapFence[]>(
    () =>
      rows.flatMap((r) => {
        const f = rowShape(r);
        return f ? [{ ...f, hue: 'grey' as const }] : [];
      }),
    [rows],
  );

  const count = (f: (r: GeofencesRow) => boolean) => rows.filter(f).length;
  const toggleStatus = (v: StatusF) => setStatusF(statusF === v ? 'all' : v);
  const toggleType = (v: ZoneType) => setTypeF(typeF === v ? 'all' : v);

  const confirmDelete = () => {
    const r = deleting;
    if (!r) return;
    del.mutate(
      {
        deleteWhere: [
          {
            table: 'vehicle_geofences',
            filter: { geofence_id: r.id } as Filter<'vehicle_geofences'> as never,
          },
        ],
        deletes: [{ table: 'geofences', keys: [{ id: r.id }] }],
      },
      {
        onSuccess: () => {
          toast(`${r.name} deleted`);
          setDeleting(null);
          if (picked === r.id) setPicked(null);
        },
      },
    );
  };

  const error = zones.error ?? links.error;
  return (
    <Stack dir="col" gap={12} align="stretch">
      <ManageToolbar
        picker={picker}
        search={q}
        onSearch={setQ}
        searchPlaceholder="Search geofence…"
        addLabel="Add Zone"
        onAdd={() => setForm({ row: null, n: Date.now() })}
        readOnly={readOnly}
      />
      {error ? (
        <Note tone="red">{error.message}</Note>
      ) : !zones.data || !links.data ? (
        <Loading>Loading geofences…</Loading>
      ) : (
        <>
          <StatusTileRow min={170}>
            <StatusTile
              label="Total Geofences"
              value={rows.length}
              icon="geofence"
              hue="blue"
              onClick={() => (setStatusF('all'), setTypeF('all'), setShapeF('all'))}
            />
            <StatusTile
              label="Active Zones"
              value={count((r) => r.active !== false)}
              icon="check"
              hue="green"
              active={statusF === 'active'}
              onClick={() => toggleStatus('active')}
            />
            <StatusTile
              label="Inactive Zones"
              value={count((r) => r.active === false)}
              icon="power"
              hue="grey"
              active={statusF === 'inactive'}
              onClick={() => toggleStatus('inactive')}
            />
            <StatusTile
              label="Restricted Zones"
              value={count((r) => typeOf(r) === 'Restricted')}
              icon={ZONE_ICON.Restricted}
              hue="red"
              active={typeF === 'Restricted'}
              onClick={() => toggleType('Restricted')}
            />
            <StatusTile
              label="Preferred Zones"
              value={count((r) => typeOf(r) === 'Preferred')}
              icon={ZONE_ICON.Preferred}
              hue="teal"
              active={typeF === 'Preferred'}
              onClick={() => toggleType('Preferred')}
            />
          </StatusTileRow>

          <Stack align="stretch" gap={12}>
            <Card
              title="Geofences"
              actions={<Chip>{shown.length} total</Chip>}
              style={{ flex: '1 1 340px', minWidth: 280 }}
            >
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
              <Stack
                dir="col"
                align="stretch"
                gap={8}
                style={{
                  marginTop: 12,
                  maxHeight: 'max(360px, calc(100vh - 360px))',
                  overflowY: 'auto',
                  padding: 2,
                }}
              >
                {shown.map((r) => {
                  const shape = shapeOf(r);
                  const type = typeOf(r);
                  const n = linkCount(r.id);
                  return (
                    <ListCard
                      key={r.id}
                      selected={r.id === sel?.id}
                      onClick={() => setPicked(r.id)}
                      lead={<IconTile icon={SHAPE_ICON[shape]} hue={SHAPE_HUE[shape]} />}
                      title={`Name: ${r.name}`}
                      subtitle={`Shape: ${shape}`}
                      actions={
                        readOnly ? undefined : (
                          <>
                            <IconButton
                              icon="edit"
                              label={`Edit ${r.name}`}
                              onClick={() => setForm({ row: r, n: Date.now() })}
                            />
                            <IconButton
                              icon="trash"
                              label={`Delete ${r.name}`}
                              onClick={() => (del.reset(), setDeleting(r))}
                            />
                          </>
                        )
                      }
                      chips={
                        <>
                          <HueChip hue={ZONE_HUE[type]} icon={ZONE_ICON[type]}>
                            {type}
                          </HueChip>
                          <HueChip hue="blue" icon="vehicles">
                            {n}
                          </HueChip>
                          <HueChip hue={r.active === false ? 'grey' : 'green'}>
                            {r.active === false ? 'Inactive' : 'Active'}
                          </HueChip>
                        </>
                      }
                    />
                  );
                })}
                {!shown.length && (
                  <EmptyState title={rows.length ? 'No zone matches' : 'No geofences yet'}>
                    {rows.length
                      ? 'Change the search or the filters.'
                      : readOnly
                        ? 'This company has no geofences.'
                        : 'Add your first zone with "Add Zone".'}
                  </EmptyState>
                )}
              </Stack>
            </Card>

            <Card
              title={sel ? sel.name : 'Geofence'}
              actions={
                sel ? (
                  <Stack gap={8}>
                    <HueChip hue="red" icon="gauge">
                      Speed Limit:{' '}
                      {sel.speed_limit_kmh != null ? `${Number(sel.speed_limit_kmh)} km/h` : '—'}
                    </HueChip>
                    <HueChip hue="blue" icon="arrowup">
                      Height Limit:{' '}
                      {sel.height_limit_m != null ? `${Number(sel.height_limit_m)} m` : '—'}
                    </HueChip>
                    <IntervalsMenu intervals={intervalsOf(sel.time_intervals)} />
                  </Stack>
                ) : undefined
              }
              style={{ flex: '1000 1 520px', minWidth: 0 }}
            >
              {sel && selShape ? (
                <StreetMap
                  key={sel.id}
                  label={`Map of ${sel.name}`}
                  fences={[selShape]}
                  fitKey={JSON.stringify(selShape.points)}
                  height="max(420px, calc(100vh - 330px))"
                />
              ) : (
                <EmptyState icon="geofence" title="No zone to show">
                  {rows.length ? 'Pick a zone on the left.' : 'Zones you add appear here.'}
                </EmptyState>
              )}
            </Card>
          </Stack>
        </>
      )}

      {form && companyId && (
        <ZoneDrawer
          key={form.n}
          row={form.row}
          companyId={companyId}
          allIds={allZones.data ?? []}
          context={context}
          onClose={() => setForm(null)}
          onSaved={(id) => {
            setForm(null);
            setPicked(id);
          }}
        />
      )}

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this geofence?"
        maxWidth={440}
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" icon="trash" onClick={confirmDelete} disabled={del.isPending}>
              {del.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        }
      >
        {deleting && (
          <Stack dir="col" align="stretch" gap={10}>
            <span>
              This permanently removes <b>{deleting.name}</b> from your geofences
              {linkCount(deleting.id)
                ? ` and, in the same step, unlinks the ${plural(linkCount(deleting.id), 'vehicle')} associated with it`
                : ' (no vehicle is associated with it)'}
              . This can&apos;t be undone.
            </span>
            {del.error && <Note tone="red">Not deleted: {del.error.message}</Note>}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
