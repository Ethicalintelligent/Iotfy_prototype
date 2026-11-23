// Manage › Device (approved design, Desktop/vs/Manage-Device.html): the company's trackers in the
// design's grid, the Add / Edit Device drawer (shared with the Partner Portal, ../../../forms) and
// delete after confirm. Real records: core.device_units + proto_vehicle.device_details, the SIM in
// each device (core.connectivity) and the vehicle it is fitted to (core.assets).
import { useMemo, useState } from 'react';
import {
  Card,
  DataGrid,
  IconButton,
  Note,
  Stack,
  StatusChip,
  downloadCsv,
  useToast,
  type GridColumn,
} from '@iotify/ui';
import {
  useAssets,
  useConnectivity,
  useDeviceDetails,
  useDeviceModels,
  useDeviceUnits,
  type DeviceDetailsRow,
  type DeviceUnitsRow,
} from '@iotify/data';
import { AddDeviceDrawer } from '../../../forms/DeviceDrawer';
import { DeleteModal } from '../../../forms/DeleteModal';
import { day } from '../../../forms/lookups';
import { ManageToolbar } from '../ManageToolbar';
import type { ModuleProps } from '../modules';

interface Row {
  id: string;
  unit: DeviceUnitsRow;
  d?: DeviceDetailsRow;
  imei: string;
  plate: string | null;
  vehicle: string | null;
  maker: string | null;
  model: string | null;
  sim: string | null;
  active: boolean;
}

export default function DeviceModule({ picker, companyId, readOnly, assetGroup }: ModuleProps) {
  const on = { enabled: !!companyId };
  const units = useDeviceUnits({ company_id: companyId }, on);
  const details = useDeviceDetails(undefined, on);
  const models = useDeviceModels();
  const assets = useAssets({ company_id: companyId }, on);
  const sims = useConnectivity(undefined, on);
  const toast = useToast();

  const [q, setQ] = useState('');
  const [freeze, setFreeze] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const [open, setOpen] = useState<{ unit?: DeviceUnitsRow; view?: boolean } | null>(null);
  const [removing, setRemoving] = useState<Row | null>(null);

  const rows = useMemo<Row[]>(() => {
    const modelOf = new Map((models.data ?? []).map((m) => [m.id, m]));
    const assetOf = new Map((assets.data ?? []).map((a) => [a.id, a]));
    const detailOf = new Map((details.data ?? []).map((d) => [d.device_unit_id, d]));
    return (units.data ?? [])
      .filter((u) => {
        const m = modelOf.get(u.device_model_id ?? '');
        const a = u.asset_id ? assetOf.get(u.asset_id) : undefined;
        // trackers: on a vehicle, or not fitted (site gateways and badges of other apps are not)
        if (m?.placement === 'Site infrastructure') return false;
        if (u.asset_id && a?.plate_serial == null) return false;
        return !assetGroup || a?.asset_group === assetGroup;
      })
      .map((u) => {
        const m = modelOf.get(u.device_model_id ?? '');
        const a = u.asset_id ? assetOf.get(u.asset_id) : undefined;
        const d = detailOf.get(u.id);
        const sim = (sims.data ?? []).find((s) => s.device_unit_id === u.id);
        return {
          id: u.id,
          unit: u,
          d,
          imei: u.imei ?? u.id,
          plate: a?.plate_serial ?? null,
          vehicle: a?.name ?? null,
          maker: m?.maker ?? null,
          model: m?.model ?? null,
          sim: sim ? sim.number || sim.identifier || sim.id : null,
          active: d?.active !== false,
        };
      })
      .sort((a, b) => a.imei.localeCompare(b.imei, 'en', { numeric: true }));
  }, [units.data, details.data, models.data, assets.data, sims.data, assetGroup]);

  const columns: GridColumn<Row>[] = [
    {
      key: 'imei',
      header: 'IMEI No',
      value: (r) => r.imei,
      cell: (r) => <b>{r.imei}</b>,
      width: 170,
    },
    { key: 'plate', header: 'Plate No', value: (r) => r.plate, width: 140 },
    {
      key: 'maker',
      header: 'Manufacturer',
      value: (r) => r.maker,
      cell: (r) => (r.maker ? r.maker.toUpperCase() : '—'),
      width: 160,
    },
    { key: 'model', header: 'Model', value: (r) => r.model, width: 150 },
    {
      key: 'purchase',
      header: 'Date of Purchase',
      value: (r) => day(r.d?.purchase_date),
      width: 170,
    },
    {
      key: 'warranty',
      header: 'Warranty Expiry Date',
      value: (r) => day(r.d?.warranty_expiry),
      width: 200,
    },
    { key: 'sim', header: 'SIM Card No', value: (r) => r.sim, width: 180 },
    {
      key: 'status',
      header: 'Status',
      value: (r) => (r.active ? 'Active' : 'Inactive'),
      cell: (r) => <StatusChip status={r.active ? 'Active' : 'Inactive'} />,
      width: 110,
    },
  ];
  const visible = columns.filter((c) => !hidden.includes(c.key));
  const loading = !units.data || !details.data || !models.data;
  const error = units.error ?? details.error ?? models.error ?? sims.error;

  return (
    <Stack dir="col" gap={12} align="stretch">
      <ManageToolbar
        picker={picker}
        search={q}
        onSearch={setQ}
        searchPlaceholder="Search device..."
        freeze={freeze}
        onFreeze={setFreeze}
        columns={columns}
        hidden={hidden}
        onHidden={setHidden}
        onDownload={() => downloadCsv('devices', visible, rows)}
        addLabel="Add Device"
        onAdd={() => setOpen({})}
        readOnly={readOnly}
      />
      {error && (
        <Note tone="red" role="alert">
          {String((error as Error).message ?? error)}
        </Note>
      )}
      <Card>
        <DataGrid<Row>
          label="Devices"
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          search={q}
          hidden={hidden}
          freeze={freeze}
          onRowClick={(r) => setOpen({ unit: r.unit, view: true })}
          empty={loading ? 'Loading devices…' : 'No devices yet. Add Device to add the first.'}
          actions={
            readOnly
              ? undefined
              : (r) => (
                  <>
                    <IconButton
                      icon="edit"
                      label={`Edit device ${r.imei}`}
                      onClick={() => setOpen({ unit: r.unit })}
                    />
                    <IconButton
                      icon="trash"
                      label={`Delete device ${r.imei}`}
                      onClick={() => setRemoving(r)}
                    />
                  </>
                )
          }
        />
      </Card>
      {open && (
        <AddDeviceDrawer
          key={open.unit?.id ?? 'new'}
          companyId={companyId}
          unit={open.unit}
          viewFirst={open.view}
          readOnly={readOnly}
          onClose={() => setOpen(null)}
          onSaved={() => toast(open.unit ? 'Device saved.' : 'Device added.')}
        />
      )}
      {removing && (
        <DeleteModal
          title="Delete this device?"
          batch={{ deletes: [{ table: 'device_units', keys: [{ id: removing.id }] }] }}
          onClose={() => setRemoving(null)}
          onDeleted={() => toast(`Device ${removing.imei} deleted.`)}
        >
          This will permanently remove device <b>{removing.imei}</b>
          {removing.vehicle ? ` (fitted to ${removing.vehicle})` : ''} and its details. A SIM card
          still in it stops the delete: take the SIM out first.
        </DeleteModal>
      )}
    </Stack>
  );
}
