// Map View of the approved GPS Vehicle Tracking design (Desktop/vs/Map-View.html): a strip of
// status tiles (each one filters), the vehicle list on the left and a live street map with plate
// and speed labels and the company's geofences. Choosing a vehicle in the list or on the map
// highlights it. Vehicles and geofences are real; positions, speeds and statuses are demo
// activity (labelled).
import { useMemo, useState } from 'react';
import {
  AutoGrid,
  Chip,
  EmptyState,
  Loading,
  Note,
  OverlayPill,
  SideLayout,
  Stack,
  StatusTile,
  StreetMap,
  type MapMarker,
} from '@iotify/ui';
import { useReloadData } from '@iotify/data';
import { DemoNote, type ScreenContext } from '@iotify/app-kit';
import { mapFence, useFleet } from '../../shared/useFleet';
import { VehicleList } from '../../shared/VehicleList';
import { STATUS, STATUS_ORDER, type VehicleStatus } from '../../shared/vehicle-status';

/** The map and the list fill the window below the tiles. */
const FILL = 'calc(100vh - 220px)';
const clock = (d: Date) => d.toLocaleTimeString('en-GB');

export default function MapViewScreen(ctx: ScreenContext) {
  const fleet = useFleet(ctx, 5_000);
  const reload = useReloadData();
  const [status, setStatus] = useState<'all' | VehicleStatus>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const fences = useMemo(() => fleet.fences.map(mapFence), [fleet.fences]);

  if (fleet.error) return <Note tone="red">{fleet.error}</Note>;
  if (fleet.loading) return <Loading>Loading vehicles…</Loading>;
  if (!fleet.live.length)
    return (
      <EmptyState title="No vehicles yet" icon="vehicles">
        Vehicles appear here once your dealer adds them to {ctx.companyName}.
      </EmptyState>
    );

  const live = fleet.live;
  const count = (s: VehicleStatus) => live.filter((v) => v.status === s).length;
  // Vehicles that never reported have no position: listed only under Yet to Transmit.
  const listed = live.filter((v) => (status === 'all' ? v.status !== 'ytt' : v.status === status));
  const markers: MapMarker[] = listed
    .filter((v) => v.status !== 'ytt')
    .map((v) => ({
      id: v.id,
      lat: v.lat,
      lng: v.lng,
      label: v.plate,
      detail: `${v.speed} km/h`,
      hue: STATUS[v.status].hue,
      pulse: v.status === 'running' || v.status === 'overspeed',
    }));
  const sel = listed.find((v) => v.id === selected) ?? null;
  const pick = (s: 'all' | VehicleStatus) => {
    setStatus(status === s ? 'all' : s);
    setSelected(null);
  };
  const choose = (id: string) => setSelected(id === selected ? null : id);

  return (
    <Stack dir="col" gap={10} align="stretch">
      <AutoGrid min={140} gap={8}>
        <StatusTile
          compact
          label="All"
          value={live.length}
          icon="vehicles"
          hue="slate"
          active={status === 'all'}
          onClick={() => pick('all')}
        />
        {STATUS_ORDER.map((s) => (
          <StatusTile
            key={s}
            compact
            label={STATUS[s].label}
            value={count(s)}
            icon={STATUS[s].icon}
            hue={STATUS[s].hue}
            active={status === s}
            onClick={() => pick(s)}
          />
        ))}
      </AutoGrid>
      <SideLayout
        sideWidth={310}
        sideHeight={FILL}
        side={<VehicleList vehicles={listed} selected={selected} onSelect={choose} />}
      >
        <StreetMap
          label={`Live map of ${markers.length} vehicles`}
          markers={markers}
          fences={fences}
          labels
          wheelZoom
          selected={selected}
          onSelect={choose}
          fitKey={status}
          height={FILL}
          overlay={
            <>
              <Chip tone="amber">Demo activity</Chip>
              {sel && (
                <OverlayPill
                  hue={STATUS[sel.status].hue}
                  action={
                    ctx.onNavigate
                      ? {
                          icon: 'navigate',
                          label: `Open ${sel.callSign} in Tracking`,
                          onClick: () => ctx.onNavigate!('tracking'),
                        }
                      : undefined
                  }
                >
                  {sel.plate} · {STATUS[sel.status].label} · {sel.speed} km/h
                </OverlayPill>
              )}
              <OverlayPill
                pulse
                action={{ icon: 'refresh', label: 'Refresh now', onClick: reload }}
              >
                Live · Updated {clock(fleet.now)}
              </OverlayPill>
            </>
          }
        />
      </SideLayout>
      {!markers.length && (
        <Note tone="grey">
          {status === 'all'
            ? 'No vehicle has reported a position yet.'
            : status === 'ytt'
              ? 'These vehicles have never reported, so they have no position on the map yet.'
              : `No ${STATUS[status].label.toLowerCase()} vehicles right now.`}
        </Note>
      )}
      <DemoNote companyName={ctx.companyName} count={live.length} />
    </Stack>
  );
}
