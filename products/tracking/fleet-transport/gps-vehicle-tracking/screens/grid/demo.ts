// Grid View: the Neon vehicles with the approved design's demo activity (root CLAUDE.md §8: shown
// with a "Demo data" label). From Neon: name, plate, vehicle type (picture), operator, odometer,
// group, fleet manager, supervisor, geofences and whether a device is fitted. From the design's 24
// demo vehicles (demoRecords.ts): status, speed, location, indicators, sensors, alerts, vehicle
// status, immobilizer and last update. A vehicle gets the demo record with its plate, otherwise the
// next record in order; a vehicle without a device has not transmitted yet.
import { DEMO_RECORDS } from './demoRecords';
import type { DemoRecord, GridVehicle } from './model';
import truckPicture from './pictures/truck.png';
import vanPicture from './pictures/van.png';
import pickupPicture from './pictures/pickup.png';
import type { Vehicle } from './useFleetData';

/** The design's own (cut-out) pictures for its three vehicle kinds. */
const DESIGN_PICTURES: Record<string, string> = {
  SMALL_TRUCK_COVERED: truckPicture,
  VAN: vanPicture,
  PICKUP_1_CABIN: pickupPicture,
};

/** The moment the design's demo times were taken ("Last report just now" = Nov 23, 2026, 02:13 PM). */
const DESIGN_NOW = Date.parse('Nov 23, 2026, 02:13 PM');

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

/** A vehicle that has not transmitted yet (no device), as the design's "Yet to Transmit" vehicles. */
function notTransmitted(record: DemoRecord): DemoRecord {
  return {
    ...record,
    status: 'Yet to Transmit',
    speed: '—',
    location: '—',
    updated: '—',
    lastReport: 'No report yet',
    sensors: record.sensors.map((s) => ({ ...s, value: '—' })),
    gps: 'No data',
    gpsSat: null,
    gsm: 'No data',
    intBat: 'No data',
    extBat: 'No data',
    extV: null,
    engine: 'No data',
    ac: record.ac === 'Not configured' ? record.ac : 'No data',
    seatbelt: record.seatbelt === 'Not configured' ? record.seatbelt : 'No data',
    frontDoor: record.frontDoor === 'Not configured' ? record.frontDoor : 'No data',
    backDoor: record.backDoor === 'Not configured' ? record.backDoor : 'No data',
  };
}

const formatKm = (km: number) => `${Math.round(km).toLocaleString('en-IN')} km`;

export function withDemoActivity(
  vehicles: Vehicle[],
  fencesOf: Map<string, string[]>,
  now: number,
): GridVehicle[] {
  const byPlate = new Map(DEMO_RECORDS.map((r) => [r.plate, r]));
  return vehicles.map((v, i) => {
    const matched = (v.plate && byPlate.get(v.plate)) || DEMO_RECORDS[i % DEMO_RECORDS.length]!; // the list is never empty
    const record = v.deviceId ? matched : notTransmitted(matched);
    // The design's update times, moved forward so they are as recent today as in the design.
    const designTime = Date.parse(record.updated);
    const updatedAt = Number.isNaN(designTime) ? null : designTime + (now - DESIGN_NOW);
    const picture = DESIGN_PICTURES[v.type.id];
    // the design record's own plate is replaced by the Neon vehicle's
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { plate: _designPlate, ...activity } = record;
    return {
      ...activity,
      id: v.id,
      order: v.index,
      name: v.name,
      plate: v.plate ?? '—',
      operator: v.operator?.name.trim() || 'Not Assigned',
      odometer: v.odometerKm != null && v.odometerKm > 0 ? formatKm(v.odometerKm) : '—',
      group: v.groupName ?? '',
      typeLabel: v.type.label,
      image: picture ?? v.type.image,
      imageFit: picture ? 'contain' : 'cover',
      fleetManager: v.fleetManager,
      supervisor: v.supervisor,
      geofenceIds: fencesOf.get(v.id) ?? [],
      updated: updatedAt == null ? '—' : DATE_FORMAT.format(updatedAt),
      updatedAt,
    };
  });
}
