// Manage > Geo Association (approved design, Desktop/vs/Manage-Geo-Association.html): which
// vehicle watches which geofence. Counts, a grid of associations (the zone's limits, alert on
// enter / leave, zone type) and a map of the ticked (or eye-button) rows' zones. "Associate
// Geofence" and Edit open the association drawer; Remove asks first.
// Real data: proto_vehicle.vehicle_geofences, geofences and the company's vehicles.
import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Chip,
  DataGrid,
  HueChip,
  IconButton,
  Legend,
  Loading,
  Modal,
  Note,
  Stack,
  StatusTile,
  StatusTileRow,
  StreetMap,
  downloadCsv,
  useToast,
  type GridColumn,
  type MapFence,
} from '@iotify/ui';
import {
  useGeofences,
  useSaveBatch,
  useVehicleGeofences,
  type GeofencesRow,
  type VehicleGeofencesRow,
} from '@iotify/data';
import { useFleet } from '../../../shared/useFleet';
import { ZONE_HUE, type ZoneType } from '../../../shared/vehicle-status';
import { ManageToolbar } from '../ManageToolbar';
import type { ModuleProps } from '../modules';
import { ZONE_ICON, daysText, intervalText, intervalsOf, rowShape } from '../geo/geo';
import { AssociationDrawer } from '../geo/AssociationDrawer';

interface Assoc {
  key: string;
  link: VehicleGeofencesRow;
  plate: string;
  callSign: string;
  zone: GeofencesRow;
  type: ZoneType;
}

const keyOf = (l: { asset_id: string; geofence_id: string }) => `${l.asset_id}|${l.geofence_id}`;
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** A green tick chip (with an optional value) or a grey dash. */
function Mark({ on, text }: { on: boolean; text?: string }) {
  return on ? (
    <HueChip hue="green" icon="check">
      {text ?? 'Yes'}
    </HueChip>
  ) : (
    <HueChip hue="grey" icon="minus">
      {text ? 'None' : 'No'}
    </HueChip>
  );
}

const COLUMNS: GridColumn<Assoc>[] = [
  {
    key: 'plate',
    header: 'Plate No.',
    value: (r) => r.plate,
    cell: (r) => <b>{r.plate}</b>,
    width: 110,
  },
  { key: 'zone', header: 'Geozone Name', value: (r) => r.zone.name, width: 150 },
  {
    key: 'speed',
    header: 'Speed',
    value: (r) => (r.zone.speed_limit_kmh != null ? Number(r.zone.speed_limit_kmh) : null),
    cell: (r) => (
      <Mark
        on={r.zone.speed_limit_kmh != null}
        text={r.zone.speed_limit_kmh != null ? `${Number(r.zone.speed_limit_kmh)} km/h` : '—'}
      />
    ),
    align: 'center',
  },
  {
    key: 'height',
    header: 'Height',
    value: (r) => (r.zone.height_limit_m != null ? Number(r.zone.height_limit_m) : null),
    cell: (r) => (
      <Mark
        on={r.zone.height_limit_m != null}
        text={r.zone.height_limit_m != null ? `${Number(r.zone.height_limit_m)} m` : '—'}
      />
    ),
    align: 'center',
  },
  {
    key: 'time',
    header: 'Time',
    value: (r) => intervalsOf(r.zone.time_intervals).map(intervalText).join(', '),
    cell: (r) => {
      const t = intervalsOf(r.zone.time_intervals);
      return (
        <Mark
          on={t.length > 0}
          text={t.length === 1 ? intervalText(t[0]!) : t.length ? `${t.length} intervals` : '—'}
        />
      );
    },
    align: 'center',
  },
  {
    key: 'enter',
    header: 'On Enter',
    value: (r) => (r.link.on_enter !== false ? 'Yes' : 'No'),
    cell: (r) => <Mark on={r.link.on_enter !== false} />,
    align: 'center',
  },
  {
    key: 'leave',
    header: 'On Leave',
    value: (r) => (r.link.on_leave !== false ? 'Yes' : 'No'),
    cell: (r) => <Mark on={r.link.on_leave !== false} />,
    align: 'center',
  },
  { key: 'days', header: 'Days', value: (r) => daysText(r.link.days) },
  {
    key: 'valid',
    header: 'Valid Till',
    value: (r) => (r.link.valid_till ? r.link.valid_till.slice(0, 10) : 'Forever'),
  },
  {
    key: 'type',
    header: 'Zone Type',
    value: (r) => r.type,
    cell: (r) => (
      <HueChip hue={ZONE_HUE[r.type]} icon={ZONE_ICON[r.type]}>
        {r.type}
      </HueChip>
    ),
  },
];

export default function GeoAssociationModule(ctx: ModuleProps) {
  const { picker, companyId, readOnly } = ctx;
  const on = { enabled: !!companyId };
  // Vehicles only (no live demo positions are shown here), so a slow refresh is enough.
  const fleet = useFleet(ctx, 3_600_000);
  const zones = useGeofences({ company_id: companyId }, on);
  const links = useVehicleGeofences(undefined, on);
  const remove = useSaveBatch();
  const toast = useToast();

  const [q, setQ] = useState('');
  const [hidden, setHidden] = useState<string[]>(['days', 'valid']);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [eyed, setEyed] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ link: VehicleGeofencesRow | null; n: number } | null>(null);
  const [removing, setRemoving] = useState<Assoc | null>(null);

  const zoneList = useMemo(
    () =>
      [...(zones.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true })),
    [zones.data],
  );
  const rows = useMemo<Assoc[]>(() => {
    const zoneById = new Map(zoneList.map((z) => [z.id, z]));
    const vById = new Map(fleet.vehicles.map((v) => [v.id, v]));
    return (links.data ?? []).flatMap((l) => {
      const zone = zoneById.get(l.geofence_id);
      const v = vById.get(l.asset_id);
      return zone && v
        ? [
            {
              key: keyOf(l),
              link: l,
              plate: v.plate,
              callSign: v.callSign,
              zone,
              type: (zone.zone_type ?? 'General') as ZoneType,
            },
          ]
        : [];
    });
  }, [links.data, zoneList, fleet.vehicles]);
  const companyLinks = useMemo(() => rows.map((r) => r.link), [rows]);

  // Zones of the ticked rows and of the rows whose eye button is on.
  const plottedZones = useMemo(() => {
    const ids = new Set(
      rows.filter((r) => ticked.has(r.key) || eyed.has(r.key)).map((r) => r.zone.id),
    );
    return zoneList.filter((z) => ids.has(z.id));
  }, [rows, ticked, eyed, zoneList]);
  const fences = plottedZones.map(rowShape).filter((f): f is MapFence => !!f);

  const mapped = new Set(rows.map((r) => r.link.asset_id)).size;
  const typeCount = (t: ZoneType) => rows.filter((r) => r.type === t).length;
  const toggleEye = (k: string) => {
    const next = new Set(eyed);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setEyed(next);
  };

  const confirmRemove = () => {
    const r = removing;
    if (!r) return;
    remove.mutate(
      {
        deletes: [
          {
            table: 'vehicle_geofences',
            keys: [{ asset_id: r.link.asset_id, geofence_id: r.link.geofence_id }],
          },
        ],
      },
      {
        onSuccess: () => {
          toast(`${r.plate} unbound from ${r.zone.name}`);
          setRemoving(null);
        },
      },
    );
  };

  const shownCols = COLUMNS.filter((c) => !hidden.includes(c.key));
  const error = fleet.error ?? zones.error?.message ?? links.error?.message ?? null;
  const loading = fleet.loading || !zones.data || !links.data;

  return (
    <Stack dir="col" gap={12} align="stretch">
      <ManageToolbar
        picker={picker}
        search={q}
        onSearch={setQ}
        searchPlaceholder="Search plate or geozone…"
        columns={COLUMNS.map((c) => ({ key: c.key, header: c.header }))}
        hidden={hidden}
        onHidden={setHidden}
        onDownload={() =>
          downloadCsv(
            'geo-associations',
            shownCols.map((c) => ({ header: c.header, value: c.value })),
            rows,
          )
        }
        addLabel="Associate Geofence"
        onAdd={() => setForm({ link: null, n: Date.now() })}
        readOnly={readOnly}
      />
      {error ? (
        <Note tone="red">{error}</Note>
      ) : loading ? (
        <Loading>Loading associations…</Loading>
      ) : (
        <>
          <StatusTileRow min={170}>
            <StatusTile
              label="Total Vehicles"
              value={fleet.vehicles.length}
              icon="vehicles"
              hue="blue"
            />
            <StatusTile label="Mapped Vehicles" value={mapped} icon="geofence" hue="green" />
            <StatusTile
              label="Unmapped Vehicles"
              value={fleet.vehicles.length - mapped}
              icon="share"
              hue="orange"
            />
            <StatusTile
              label="Preferred Zone Associations"
              value={typeCount('Preferred')}
              icon={ZONE_ICON.Preferred}
              hue="purple"
            />
            <StatusTile
              label="Restricted Zone Associations"
              value={typeCount('Restricted')}
              icon={ZONE_ICON.Restricted}
              hue="red"
            />
          </StatusTileRow>

          <Stack align="stretch" gap={12}>
            <Card style={{ flex: '1000 1 600px', minWidth: 0 }}>
              <DataGrid
                label="Geo associations"
                rows={rows}
                columns={COLUMNS}
                rowKey={(r) => r.key}
                search={q}
                hidden={hidden}
                selected={ticked}
                onSelectedChange={setTicked}
                empty={
                  zoneList.length
                    ? 'No vehicle is associated with a geofence yet.'
                    : 'Add a zone in Geo Configuration first.'
                }
                actions={(r) => (
                  <>
                    <IconButton
                      icon="eye"
                      label={`${eyed.has(r.key) ? 'Hide' : 'Show'} ${r.zone.name} on the map`}
                      active={eyed.has(r.key)}
                      onClick={() => toggleEye(r.key)}
                    />
                    {!readOnly && (
                      <>
                        <IconButton
                          icon="edit"
                          label={`Edit ${r.plate} · ${r.zone.name}`}
                          onClick={() => setForm({ link: r.link, n: Date.now() })}
                        />
                        <IconButton
                          icon="trash"
                          label={`Remove ${r.plate} · ${r.zone.name}`}
                          onClick={() => (remove.reset(), setRemoving(r))}
                        />
                      </>
                    )}
                  </>
                )}
              />
            </Card>
            <Card
              title="Selected Geofences"
              actions={<Chip>{plural(fences.length, 'geofence')} plotted</Chip>}
              style={{ flex: '1 1 420px', minWidth: 300 }}
            >
              <StreetMap
                label={`Map of ${plural(fences.length, 'plotted geofence')}`}
                fences={fences}
                fitKey={plottedZones.map((z) => z.id).join(',')}
                height="max(380px, calc(100vh - 360px))"
                footer={
                  !fences.length ? (
                    <Chip>Tick rows or use the eye button to plot their geofences</Chip>
                  ) : undefined
                }
              />
              {fences.length > 0 && (
                <Stack justify="space-between" style={{ marginTop: 10 }}>
                  <Legend
                    items={plottedZones.map((z) => ({
                      label: z.name,
                      hue: ZONE_HUE[(z.zone_type ?? 'General') as ZoneType],
                    }))}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="close"
                    onClick={() => (setTicked(new Set()), setEyed(new Set()))}
                  >
                    Clear
                  </Button>
                </Stack>
              )}
            </Card>
          </Stack>
        </>
      )}

      {form && (
        <AssociationDrawer
          key={form.n}
          link={form.link}
          zones={zoneList}
          vehicles={fleet.vehicles}
          existing={companyLinks}
          onClose={() => setForm(null)}
          onSaved={() => setForm(null)}
        />
      )}

      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Remove this association?"
        maxWidth={440}
        footer={
          <>
            <Button onClick={() => setRemoving(null)}>Cancel</Button>
            <Button
              variant="danger"
              icon="trash"
              onClick={confirmRemove}
              disabled={remove.isPending}
            >
              {remove.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </>
        }
      >
        {removing && (
          <Stack dir="col" align="stretch" gap={10}>
            <span>
              <b>{removing.plate}</b> will be unbound from <b>{removing.zone.name}</b>; entering or
              leaving it will no longer raise alerts.
            </span>
            {remove.error && <Note tone="red">Not removed: {remove.error.message}</Note>}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
