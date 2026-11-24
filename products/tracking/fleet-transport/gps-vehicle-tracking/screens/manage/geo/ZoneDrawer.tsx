// Add Zone / Edit Zone (approved design, Desktop/vs/Manage-Geo-Configuration.html): a drawer with
// Zone Details (name, a street map to click the circle's centre or the boundary's corners, radius
// or points, shape, status, type, speed and height limits) and Time Intervals. Saves one row of
// proto_vehicle.geofences.
import { useState } from 'react';
import {
  Button,
  Chip,
  Drawer,
  Field,
  FieldAction,
  FormSection,
  Note,
  RangeField,
  SelectField,
  Stack,
  StreetMap,
  Switch,
  TextField,
  TimeRange,
  useToast,
  type MapFence,
} from '@iotify/ui';
import { useSaveBatch, type GeofencesRow } from '@iotify/data';
import { nextId } from '@iotify/app-kit';
import type { ZoneType } from '../../../shared/vehicle-status';
import {
  RADIUS,
  ZONE_TYPES,
  blankZone,
  zoneFromRow,
  zoneProblems,
  zoneRow,
  zoneShape,
  type LatLng,
  type Shape,
  type ZoneDraft,
} from './geo';

const STEPS = [
  { key: 'zone', label: 'Zone Details' },
  { key: 'time', label: 'Time Intervals' },
];

function mapHint(d: ZoneDraft): string {
  if (d.shape === 'Circle')
    return d.centre
      ? 'Click the map again to move the centre'
      : 'Click on the map to place the circle centre';
  const n = d.points.length;
  if (!n) return 'Click to start drawing the boundary';
  const pts = `${n} point${n === 1 ? '' : 's'}`;
  return n < 3
    ? `${pts} · keep clicking to add, at least 3 needed`
    : `${pts} · keep clicking to add, the shape closes itself`;
}

export function ZoneDrawer({
  row,
  companyId,
  allIds,
  context,
  onClose,
  onSaved,
}: {
  /** The zone being edited, or null for a new one. */
  row: GeofencesRow | null;
  companyId: string;
  /** Every geofence id (all companies share the id space), for the new id. */
  allIds: { id: string }[];
  /** The company's other zones, drawn in grey for reference while adding. */
  context: MapFence[];
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const start = () => (row ? zoneFromRow(row) : blankZone());
  const [d, setD] = useState<ZoneDraft>(start);
  const [tried, setTried] = useState(false);
  const save = useSaveBatch();
  const toast = useToast();
  const set = (p: Partial<ZoneDraft>) => setD((x) => ({ ...x, ...p }));
  const problems = zoneProblems(d);
  const circle = d.shape === 'Circle';

  const shape = zoneShape(
    row?.id ?? 'new',
    d.name.trim() || 'New zone',
    d.shape,
    d.centre,
    d.radiusM,
    d.points,
    d.zoneType,
  );
  // The corners (or the centre) as small dots while drawing.
  const dots: LatLng[] = circle ? (d.centre ? [d.centre] : []) : d.points;
  const fences = [...(row ? [] : context), ...(shape ? [shape] : [])];

  const click = (lat: number, lng: number) =>
    circle ? set({ centre: [lat, lng] }) : set({ points: [...d.points, [lat, lng]] });

  const submit = () => {
    setTried(true);
    if (problems.length) return;
    const id = row?.id ?? nextId('GF', allIds);
    const r = zoneRow(d, id, companyId);
    save.mutate(
      row
        ? { updates: [{ table: 'geofences', rows: [r] }] }
        : { upserts: [{ table: 'geofences', rows: [r] }] },
      {
        onSuccess: () => {
          toast(row ? `${r.name} saved` : `${r.name} added`);
          onSaved(id);
        },
      },
    );
  };

  const notice = save.error ? (
    <Note tone="red">Not saved: {save.error.message}</Note>
  ) : tried && problems.length ? (
    <Note tone="amber">{problems.join(' ')}</Note>
  ) : null;

  return (
    <Drawer
      open
      onClose={onClose}
      icon={row ? 'edit' : 'plus'}
      title={row ? 'Edit Zone' : 'Add Zone'}
      subtitle={row ? `Update ${row.name}` : 'Draw and configure a geofence'}
      steps={STEPS}
      notice={notice}
      footer={
        <>
          <Button
            onClick={() => {
              setD(start());
              setTried(false);
              save.reset();
            }}
          >
            Reset
          </Button>
          <Button variant="primary" onClick={submit} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : row ? 'Save Changes' : 'Add Zone'}
          </Button>
        </>
      }
    >
      <FormSection id="zone" title="Zone Details" icon="info" cols={1}>
        <Stack align="start" gap={14}>
          <Stack dir="col" align="stretch" gap={10} style={{ flex: '2 1 340px', minWidth: 0 }}>
            <TextField
              label="Geozone Name"
              required
              value={d.name}
              onChange={(v) => set({ name: v })}
              placeholder="e.g. North Depot"
            />
            <StreetMap
              label={circle ? 'Map: click to place the circle centre' : 'Map: click to add corners'}
              fences={fences}
              route={dots.length ? { points: [dots[0]!], stops: dots } : undefined}
              fitKey="zone"
              onMapClick={click}
              height={270}
              overlay={
                !circle && d.points.length ? (
                  <Button variant="danger" size="sm" onClick={() => set({ points: [] })}>
                    Clear
                  </Button>
                ) : undefined
              }
              footer={<Chip>{mapHint(d)}</Chip>}
            />
            {circle ? (
              <RangeField
                label="Zone Radius"
                min={RADIUS.min}
                max={RADIUS.max}
                step={RADIUS.step}
                value={d.radiusM}
                onChange={(v) => set({ radiusM: v })}
                format={(v) => `${v.toLocaleString('en-US')} m`}
              />
            ) : (
              <Field label="Points Plotted">
                <Stack gap={10}>
                  <b>
                    {d.points.length} point{d.points.length === 1 ? '' : 's'}
                  </b>
                  {d.points.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon="refresh"
                      onClick={() => set({ points: d.points.slice(0, -1) })}
                    >
                      Undo last
                    </Button>
                  )}
                </Stack>
              </Field>
            )}
          </Stack>
          <Stack dir="col" align="stretch" gap={10} style={{ flex: '1 1 170px' }}>
            <SelectField
              label="Geozone Shape"
              value={d.shape}
              onChange={(v) => set({ shape: v as Shape })}
              options={[
                { value: 'Circle', label: 'Circle' },
                { value: 'Freeform', label: 'Freeform' },
              ]}
            />
            <Field label="Status">
              <Switch
                label="Status"
                checked={d.active}
                onChange={(v) => set({ active: v })}
                showState
              />
            </Field>
            <SelectField
              label="Geozone Type"
              value={d.zoneType}
              onChange={(v) => set({ zoneType: v as ZoneType })}
              options={ZONE_TYPES.map((t) => ({ value: t, label: t }))}
            />
            <TextField
              label="Speed Limit"
              type="number"
              value={d.speed}
              onChange={(v) => set({ speed: v })}
              placeholder="Optional · km/h"
            />
            <TextField
              label="Height Limit"
              type="number"
              value={d.height}
              onChange={(v) => set({ height: v })}
              placeholder="Optional · m"
            />
          </Stack>
        </Stack>
      </FormSection>
      <FormSection id="time" title="Time Intervals" icon="clock" cols={1}>
        <Stack dir="col" align="start" gap={8}>
          {d.intervals.map((i, k) => (
            <TimeRange
              key={k}
              label={`Interval ${k + 1}`}
              from={i.from}
              to={i.to}
              onChange={(from, to) =>
                set({ intervals: d.intervals.map((x, n) => (n === k ? { from, to } : x)) })
              }
              onRemove={() => set({ intervals: d.intervals.filter((_, n) => n !== k) })}
            />
          ))}
          {!d.intervals.some((i) => i.from && i.to) && (
            <Chip>No time interval: the zone applies all day.</Chip>
          )}
          <FieldAction onClick={() => set({ intervals: [...d.intervals, { from: '', to: '' }] })}>
            Add Interval
          </FieldAction>
        </Stack>
      </FormSection>
    </Drawer>
  );
}
