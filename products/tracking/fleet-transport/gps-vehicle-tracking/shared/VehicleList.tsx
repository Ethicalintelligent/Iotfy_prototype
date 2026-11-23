// The vehicle side list of Map View and Tracking (approved design, Desktop/vs): "Vehicles 24",
// a status filter, search, and a card per vehicle with its picture, operator, status and the
// AC / seat-belt chips.
import { useState, type ReactNode } from 'react';
import { Card, HueChip, ListCard, PillSelect, SearchInput, Stack } from '@iotify/ui';
import { VehiclePhoto } from '@iotify/illustrations';
import type { LiveVehicle } from '../demo/fleet';
import { STATUS, STATUS_ORDER, type VehicleStatus } from './vehicle-status';

export type StatusFilter = 'all' | VehicleStatus;

/** Search and status filter for a vehicle list. */
export function filterVehicles(vs: LiveVehicle[], q: string, status: StatusFilter) {
  const s = q.trim().toLowerCase();
  return vs.filter(
    (v) =>
      (status === 'all' || v.status === status) &&
      (!s ||
        `${v.callSign} ${v.plate} ${v.operator ?? ''} ${v.group ?? ''}`.toLowerCase().includes(s)),
  );
}

/** AC and seat-belt chips of a vehicle (— when its tracker isn't reporting). */
export function SensorChips({ v }: { v: LiveVehicle }) {
  return (
    <>
      <HueChip hue={v.ac == null ? 'grey' : v.ac ? 'blue' : 'slate'} icon="snow">
        AC {v.ac == null ? '—' : v.ac ? 'On' : 'Off'}
      </HueChip>
      <HueChip hue={v.belt == null ? 'grey' : v.belt ? 'green' : 'red'} icon="seat">
        Belt {v.belt == null ? '—' : v.belt ? 'Fastened' : 'Unfastened'}
      </HueChip>
    </>
  );
}

export function VehicleList({
  vehicles,
  selected,
  onSelect,
  header,
}: {
  vehicles: LiveVehicle[];
  selected?: string | null;
  onSelect?: (id: string) => void;
  /** Extra content under the search (e.g. a group filter). */
  header?: ReactNode;
}) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const shown = filterVehicles(vehicles, q, status);
  return (
    <Card
      icon="vehicles"
      title={
        <Stack gap={8} wrap={false}>
          Vehicles <HueChip hue="slate">{shown.length}</HueChip>
        </Stack>
      }
      actions={
        <PillSelect
          icon="filter"
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All' },
            ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS[s].label })),
          ]}
        />
      }
    >
      <SearchInput value={q} onChange={setQ} placeholder="Search vehicles…" />
      {header}
      <Stack dir="col" gap={8} align="stretch">
        {shown.map((v) => (
          <ListCard
            key={v.id}
            selected={v.id === selected}
            onClick={onSelect ? () => onSelect(v.id) : undefined}
            lead={<VehiclePhoto category={v.category} size={40} />}
            title={v.callSign}
            subtitle={v.operator ?? 'Unassigned'}
            badge={<HueChip hue={STATUS[v.status].hue}>{STATUS[v.status].label}</HueChip>}
            chips={v.status !== 'ytt' ? <SensorChips v={v} /> : undefined}
          />
        ))}
        {!shown.length && <HueChip hue="grey">No vehicles match.</HueChip>}
      </Stack>
    </Card>
  );
}
