// A vehicle's saved details (proto_vehicle) on its asset page, read-only; "Edit vehicle" opens the
// approved Edit Vehicle drawer.
import { Button, Card, Chip, FieldGrid, Loading, Note, Stack, TextField } from '@iotify/ui';
import {
  useGeofences,
  useUsers,
  useVehicleDetails,
  useVehicleGeofences,
  useVehicleIo,
  type AssetsRow,
} from '@iotify/data';

/** A value as text; dates (yyyy-mm-dd…) without their time part. */
const show = (v: unknown, unit = '') => {
  if (v == null || v === '') return '—';
  const t = String(v);
  return `${/^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : t}${unit}`;
};

export function VehicleSummary({ asset, onEdit }: { asset: AssetsRow; onEdit?: () => void }) {
  const details = useVehicleDetails({ asset_id: asset.id });
  const io = useVehicleIo({ asset_id: asset.id });
  const links = useVehicleGeofences({ asset_id: asset.id });
  const fences = useGeofences({ company_id: asset.company_id ?? '__none' });
  const people = useUsers({ account_id: asset.company_id ?? '__none' });
  const d = details.data?.[0];
  const person = (id: string | null | undefined) =>
    people.data?.find((u) => u.id === id)?.name ?? id;
  const actions = onEdit && (
    <Button size="sm" icon="edit" onClick={onEdit}>
      Edit vehicle
    </Button>
  );
  if (details.isLoading) return <Loading>Loading vehicle details…</Loading>;
  if (!d)
    return (
      <Card title="Vehicle details" actions={actions}>
        <Note tone="grey">
          No vehicle details yet (call sign, make, fuel, tracking). Press Edit vehicle to add them.
        </Note>
      </Card>
    );
  const field = (label: string, value: string) => (
    <TextField key={label} label={label} value={value} readOnly />
  );
  const fenceNames = (links.data ?? [])
    .map((l) => fences.data?.find((g) => g.id === l.geofence_id)?.name ?? l.geofence_id)
    .sort();
  return (
    <Card title="Vehicle details" actions={actions}>
      <FieldGrid>
        {field('Call sign', show(asset.name))}
        {field('Plate number', show(asset.plate_serial))}
        {field('Category', show(d.category))}
        {field('Make / model', [d.make, d.model].filter(Boolean).join(' ') || '—')}
        {field('Year · colour', [d.year, d.color].filter(Boolean).join(' · ') || '—')}
        {field('VIN / chassis', show(d.vin))}
        {field('Fleet manager', show(person(d.fleet_manager_id)))}
        {field('Operator', show(d.operator_name))}
        {field(
          'Fuel',
          [
            d.fuel_type,
            d.tank_capacity_l != null && `${d.tank_capacity_l} L tank`,
            d.mileage_km_l != null && `${d.mileage_km_l} km/L`,
          ]
            .filter(Boolean)
            .join(' · ') || '—',
        )}
        {field('Speed limit', show(d.speed_limit_kmh, ' km/h'))}
        {field('Insurance expiry', show(d.insurance_expiry))}
        {field('Permit expiry', show(d.permit_expiry))}
      </FieldGrid>
      <Stack gap={6} wrap>
        <b style={{ fontSize: 12 }}>Geofences:</b>
        {fenceNames.length ? (
          fenceNames.map((n) => (
            <Chip key={n} tone="green">
              {n}
            </Chip>
          ))
        ) : (
          <span className="ui-muted">None</span>
        )}
      </Stack>
      <Stack gap={6} wrap>
        <b style={{ fontSize: 12 }}>Tracker inputs:</b>
        {io.data?.length ? (
          io.data.map((r) => (
            <Chip key={r.id} tone="blue">
              {r.kind}
              {r.port_no ? ` ${r.port_no}` : ''}: {r.signal}
            </Chip>
          ))
        ) : (
          <span className="ui-muted">None</span>
        )}
      </Stack>
    </Card>
  );
}
