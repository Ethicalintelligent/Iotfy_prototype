// Manage › Vehicle (approved design, Desktop/vs/Manage-Vehicle.html): the company's vehicles in the
// design's grid (checkboxes, filters, freeze, columns, CSV download, bulk upload, Multi-Edit), the
// Add / Edit Vehicle drawer (shared with the Partner Portal, ../../../forms) and delete after
// confirm. Real records: core.assets + proto_vehicle.vehicle_details (no demo activity here).
import { useMemo, useState } from 'react';
import {
  Card,
  DataGrid,
  IconButton,
  Note,
  Stack,
  StatusChip,
  ToolButton,
  downloadCsv,
  useToast,
  type GridColumn,
} from '@iotify/ui';
import { VehiclePhoto } from '@iotify/illustrations';
import {
  useAssetGroups,
  useAssets,
  useDeviceUnits,
  useOperators,
  useRoles,
  useUsers,
  useVehicleDetails,
  useVehicleIo,
  type AssetsRow,
  type Batch,
  type VehicleDetailsRow,
} from '@iotify/data';
import { useCoreRules } from '@iotify/app-kit';
import { AddVehicleDrawer, VEHICLE_TYPE } from '../../../forms/VehicleDrawer';
import { MultiEditVehiclesDrawer } from '../../../forms/MultiEditVehiclesDrawer';
import { DeleteModal } from '../../../forms/DeleteModal';
import { ImportModal, type ImportCheck } from '../../../forms/ImportModal';
import { nextIds } from '../../../forms/lookups';
import { ManageToolbar } from '../ManageToolbar';
import type { ModuleProps } from '../modules';

interface Row {
  id: string;
  asset: AssetsRow;
  d?: VehicleDetailsRow;
  group: string | null;
  plate: string;
  callSign: string;
  category: string | null;
  operator: string | null;
  fleetManager: string | null;
  supervisor: string | null;
  imei: string | null;
  unitId: string | null;
  fuelSensor: string | null;
}

const n = (v: unknown) => (v == null || v === '' ? null : Number(v));

export default function VehicleModule({
  picker,
  product,
  companyId,
  readOnly,
  assetGroup,
}: ModuleProps) {
  const on = { enabled: !!companyId };
  const { rules } = useCoreRules();
  const assets = useAssets({ company_id: companyId }, on);
  const allAssets = useAssets();
  const details = useVehicleDetails(undefined, on);
  const operators = useOperators({ company_id: companyId }, on);
  const people = useUsers({ account_id: companyId }, on);
  const roles = useRoles();
  const units = useDeviceUnits({ company_id: companyId }, on);
  const io = useVehicleIo(undefined, on);
  const groups = useAssetGroups({ company_id: companyId }, on);
  const allGroups = useAssetGroups();
  const toast = useToast();

  const [q, setQ] = useState('');
  const [freeze, setFreeze] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<{ asset?: AssetsRow; view?: boolean } | null>(null);
  const [removing, setRemoving] = useState<Row | null>(null);
  const [importing, setImporting] = useState(false);
  const [multi, setMulti] = useState(false);

  const rows = useMemo<Row[]>(() => {
    const types = rules?.productAssetTypes(product) ?? new Set<string>([VEHICLE_TYPE]);
    const byId = new Map((details.data ?? []).map((d) => [d.asset_id, d]));
    const opName = new Map((operators.data ?? []).map((o) => [o.id, o.name]));
    const person = new Map((people.data ?? []).map((u) => [u.id, u.name ?? u.id]));
    return (assets.data ?? [])
      .filter(
        (a) =>
          (types.has(a.asset_type_id ?? '') || a.asset_type_id === VEHICLE_TYPE) &&
          (!assetGroup || a.asset_group === assetGroup),
      )
      .map((a) => {
        const d = byId.get(a.id);
        const unit = (units.data ?? []).find((u) => u.asset_id === a.id);
        const sensor = (io.data ?? []).find(
          (r) => r.asset_id === a.id && /fuel/i.test(r.signal ?? ''),
        );
        return {
          id: a.id,
          asset: a,
          d,
          group: a.asset_group ?? null,
          plate: a.plate_serial ?? '',
          callSign: a.name ?? a.id,
          category: d?.category ?? null,
          operator: (d?.operator_id && opName.get(d.operator_id)) || d?.operator_name || null,
          fleetManager: d?.fleet_manager_id ? (person.get(d.fleet_manager_id) ?? null) : null,
          supervisor: d?.supervisor_id ? (person.get(d.supervisor_id) ?? null) : null,
          imei: unit?.imei ?? null,
          unitId: unit?.id ?? null,
          fuelSensor: sensor ? `${sensor.kind}${sensor.port_no ? ' ' + sensor.port_no : ''}` : null,
        };
      })
      .sort((a, b) => a.callSign.localeCompare(b.callSign, 'en', { numeric: true }));
  }, [
    rules,
    product,
    assets.data,
    details.data,
    operators.data,
    people.data,
    units.data,
    io.data,
    assetGroup,
  ]);

  const columns: GridColumn<Row>[] = [
    { key: 'group', header: 'Group', value: (r) => r.group, width: 130 },
    {
      key: 'plate',
      header: 'Plate Number',
      value: (r) => r.plate,
      cell: (r) => <b>{r.plate || '—'}</b>,
      width: 150,
    },
    { key: 'callSign', header: 'Call Sign', value: (r) => r.callSign, width: 120 },
    {
      key: 'category',
      header: 'Category',
      value: (r) => r.category,
      width: 200,
      cell: (r) =>
        r.category ? (
          <span
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
          >
            <VehiclePhoto category={r.category} size={26} />
            {r.category}
          </span>
        ) : (
          '—'
        ),
    },
    { key: 'operator', header: 'Operator', value: (r) => r.operator, width: 150 },
    { key: 'fleetManager', header: 'Fleet Manager', value: (r) => r.fleetManager, width: 170 },
    { key: 'supervisor', header: 'Supervisor', value: (r) => r.supervisor, width: 170 },
    { key: 'make', header: 'Make', value: (r) => r.d?.make, width: 110 },
    { key: 'model', header: 'Model', value: (r) => r.d?.model, width: 110 },
    { key: 'imei', header: 'Device IMEI', value: (r) => r.imei, width: 160 },
    {
      key: 'odometer',
      header: 'Odometer',
      value: (r) => n(r.d?.odometer_km),
      cell: (r) => (r.d?.odometer_km != null ? Math.round(Number(r.d.odometer_km)) : '—'),
      width: 110,
    },
    {
      key: 'status',
      header: 'Status',
      value: (r) => r.asset.status ?? 'Active',
      cell: (r) => <StatusChip status={r.asset.status ?? 'Active'} />,
      width: 110,
    },
    { key: 'fuelType', header: 'Type of Fuel', value: (r) => r.d?.fuel_type, width: 130 },
    {
      key: 'tank',
      header: 'Fuel Tank Capacity (L)',
      value: (r) => n(r.d?.tank_capacity_l),
      width: 190,
    },
    { key: 'fuelSensor', header: 'Fuel Sensor ID', value: (r) => r.fuelSensor, width: 150 },
    {
      key: 'calibration',
      header: 'Calibration Status',
      value: (r) => (r.d?.fuel_calibration ? 'Calibrated' : r.fuelSensor ? 'Not calibrated' : null),
      width: 170,
    },
  ];
  const visible = columns.filter((c) => !hidden.includes(c.key));

  const loading = !assets.data || !details.data || !rules;
  const error = assets.error ?? details.error ?? operators.error ?? units.error;

  // ------------------------------------------------ bulk upload (one transaction)
  const check = (lines: Record<string, string>[]): ImportCheck => {
    const problems: string[] = [];
    const byPlate = new Map(rows.map((r) => [r.plate.toUpperCase(), r]));
    const roleId = (name: string) => roles.data?.find((x) => x.name === name)?.id;
    const personIn = (role: string, name: string) =>
      (people.data ?? []).find(
        (u) => u.role_id === roleId(role) && (u.name ?? '').toLowerCase() === name.toLowerCase(),
      );
    const seen = new Set<string>();
    const newIds = nextIds('A', allAssets.data ?? [], lines.length);
    const newGroupNames = new Set<string>();
    const knownGroups = new Set([...(groups.data ?? []).map((g) => g.name)]);
    const assetsNew: Partial<AssetsRow>[] = [];
    const assetsChanged: Partial<AssetsRow>[] = [];
    const detailRows: Partial<VehicleDetailsRow>[] = [];
    const unitUpdates: {
      id: string;
      asset_id: string | null;
      status: 'Installed' | 'In stock';
      company_id?: string;
    }[] = [];
    let added = 0;
    let updated = 0;
    lines.forEach((l, i) => {
      const at = `Row ${i + 2}`;
      const bad: string[] = [];
      const plate = (l['Plate Number'] ?? '').trim().toUpperCase();
      if (!plate) return problems.push(`${at}: Plate Number is empty.`);
      if (seen.has(plate))
        return problems.push(`${at}: Plate Number ${plate} is in the file twice.`);
      seen.add(plate);
      const existing = byPlate.get(plate);
      const elsewhere =
        !existing &&
        (allAssets.data ?? []).find((a) => (a.plate_serial ?? '').toUpperCase() === plate);
      if (elsewhere) bad.push(`plate ${plate} belongs to another company's asset`);
      const call = (l['Call Sign'] ?? '').trim();
      if (!existing && !call) bad.push('Call Sign is empty (needed for a new vehicle)');
      const id = existing?.id ?? newIds[i]!;
      const val = (h: string) => (l[h] ?? '').trim();
      const numOf = (h: string) => {
        const v = val(h);
        if (!v) return undefined;
        const x = Number(v.replace(/,/g, ''));
        if (Number.isNaN(x) || x < 0) {
          bad.push(`${h} "${v}" is not a number`);
          return undefined;
        }
        return x;
      };
      const status = val('Status');
      if (status && status !== 'Active' && status !== 'Inactive')
        bad.push(`Status must be Active or Inactive, not "${status}"`);
      const op = val('Operator');
      const operator = op
        ? (operators.data ?? []).find((o) => o.name.toLowerCase() === op.toLowerCase())
        : undefined;
      if (op && !operator) bad.push(`Operator "${op}" is not in Manage › Operator`);
      const fm = val('Fleet Manager');
      const fleetManager = fm ? personIn('Fleet Manager', fm) : undefined;
      if (fm && !fleetManager)
        bad.push(`Fleet Manager "${fm}" is not a Fleet Manager of this company`);
      const sv = val('Supervisor');
      const supervisor = sv ? personIn('Fleet Supervisor', sv) : undefined;
      if (sv && !supervisor)
        bad.push(`Supervisor "${sv}" is not a Fleet Supervisor of this company`);
      const imei = val('Device IMEI');
      const unit = imei ? (units.data ?? []).find((u) => u.imei === imei) : undefined;
      if (imei && !unit) bad.push(`Device IMEI ${imei} is not one of your devices`);
      else if (unit?.asset_id && unit.asset_id !== id)
        bad.push(`Device IMEI ${imei} is fitted to another vehicle`);
      const odometer = numOf('Odometer');
      const tank = numOf('Fuel Tank Capacity (L)');
      if (bad.length) return problems.push(`${at} (${plate}): ${bad.join('; ')}.`);

      const group = val('Group');
      if (group && !knownGroups.has(group)) newGroupNames.add(group);
      const asset: Partial<AssetsRow> = { id };
      if (call) asset.name = call;
      if (group) asset.asset_group = group;
      if (status) asset.status = status as 'Active';
      if (existing) {
        if (Object.keys(asset).length > 1) assetsChanged.push(asset);
        updated++;
      } else {
        assetsNew.push({
          ...asset,
          company_id: companyId,
          asset_type_id: VEHICLE_TYPE,
          plate_serial: plate,
          status: (status || 'Active') as 'Active',
        });
        added++;
      }
      const d: Partial<VehicleDetailsRow> = { asset_id: id };
      if (val('Category')) d.category = val('Category');
      if (operator) {
        d.operator_id = operator.id;
        d.operator_name = operator.name;
      }
      if (fleetManager) d.fleet_manager_id = fleetManager.id;
      if (supervisor) d.supervisor_id = supervisor.id;
      if (val('Make')) d.make = val('Make');
      if (val('Model')) d.model = val('Model');
      if (odometer !== undefined) d.odometer_km = odometer;
      if (val('Type of Fuel')) d.fuel_type = val('Type of Fuel');
      if (tank !== undefined) d.tank_capacity_l = tank;
      if (Object.keys(d).length > 1 || !existing) detailRows.push(d);
      if (unit && unit.asset_id !== id) {
        if (existing?.unitId)
          unitUpdates.push({ id: existing.unitId, asset_id: null, status: 'In stock' });
        unitUpdates.push({ id: unit.id, asset_id: id, status: 'Installed', company_id: companyId });
      }
    });
    const groupIds = nextIds('GRP', allGroups.data ?? [], newGroupNames.size);
    const batch: Batch = {
      upserts: [
        ...(newGroupNames.size
          ? [
              {
                table: 'asset_groups' as const,
                rows: [...newGroupNames].map((name, i) => ({
                  id: groupIds[i]!,
                  company_id: companyId,
                  name,
                })),
              },
            ]
          : []),
        ...(assetsNew.length ? [{ table: 'assets' as const, rows: assetsNew }] : []),
        ...(detailRows.length ? [{ table: 'vehicle_details' as const, rows: detailRows }] : []),
      ],
      updates: [
        ...(assetsChanged.length ? [{ table: 'assets' as const, rows: assetsChanged }] : []),
        ...(unitUpdates.length ? [{ table: 'device_units' as const, rows: unitUpdates }] : []),
      ],
    };
    const parts = [
      added && `${added} new vehicle${added === 1 ? '' : 's'}`,
      updated && `${updated} updated`,
    ].filter(Boolean);
    return { problems, batch, summary: parts.join(', ') || 'nothing to change' };
  };

  const chosen = rows.filter((r) => selected.has(r.id));
  return (
    <Stack dir="col" gap={12} align="stretch">
      <ManageToolbar
        picker={picker}
        search={q}
        onSearch={setQ}
        searchPlaceholder="Search vehicle..."
        freeze={freeze}
        onFreeze={setFreeze}
        columns={columns}
        hidden={hidden}
        onHidden={setHidden}
        onDownload={() => downloadCsv('vehicles', visible, chosen.length ? chosen : rows)}
        onUpload={() => setImporting(true)}
        extra={
          !readOnly && (
            <ToolButton
              icon="edit"
              active={chosen.length >= 2}
              label={
                chosen.length >= 2
                  ? `Multi-Edit: edit the ${chosen.length} ticked vehicles together`
                  : 'Multi-Edit: tick two or more vehicles to edit them together'
              }
              onClick={() =>
                chosen.length >= 2
                  ? setMulti(true)
                  : toast('Tick two or more vehicles to edit them together.')
              }
            >
              {chosen.length >= 2 ? `${chosen.length}` : undefined}
            </ToolButton>
          )
        }
        addLabel="Add Vehicle"
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
          label="Vehicles"
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          search={q}
          hidden={hidden}
          freeze={freeze}
          selected={readOnly ? undefined : selected}
          onSelectedChange={setSelected}
          onRowClick={(r) => setOpen({ asset: r.asset, view: true })}
          empty={loading ? 'Loading vehicles…' : 'No vehicles yet. Add Vehicle to add the first.'}
          actions={
            readOnly
              ? undefined
              : (r) => (
                  <>
                    <IconButton
                      icon="edit"
                      label={`Edit ${r.callSign}`}
                      onClick={() => setOpen({ asset: r.asset })}
                    />
                    <IconButton
                      icon="trash"
                      label={`Delete ${r.callSign}`}
                      onClick={() => setRemoving(r)}
                    />
                  </>
                )
          }
        />
      </Card>
      {open && (
        <AddVehicleDrawer
          key={open.asset?.id ?? 'new'}
          companyId={companyId}
          asset={open.asset}
          viewFirst={open.view}
          readOnly={readOnly}
          onClose={() => setOpen(null)}
          onSaved={() => toast(open.asset ? 'Vehicle saved.' : 'Vehicle added.')}
        />
      )}
      {multi && (
        <MultiEditVehiclesDrawer
          companyId={companyId}
          assets={chosen.map((r) => r.asset)}
          onClose={() => setMulti(false)}
          onSaved={() => {
            toast(`${chosen.length} vehicles saved.`);
            setSelected(new Set());
          }}
        />
      )}
      {removing && (
        <DeleteModal
          title="Delete this vehicle?"
          batch={{ deletes: [{ table: 'assets', keys: [{ id: removing.id }] }] }}
          onClose={() => setRemoving(null)}
          onDeleted={() => {
            const next = new Set(selected);
            next.delete(removing.id);
            setSelected(next);
            toast(`${removing.callSign} deleted.`);
          }}
        >
          This will permanently remove{' '}
          <b>
            {removing.callSign} ({removing.plate || removing.id})
          </b>{' '}
          with its details, geofence links and tracker inputs. A fitted tracker or other records
          that use it stop the delete.
        </DeleteModal>
      )}
      {importing && (
        <ImportModal
          noun="vehicles"
          headers={visible.map((c) => c.header)}
          required={['Plate Number']}
          note="A row with a known Plate Number updates that vehicle (empty cells stay as they are); other rows add vehicles. Fuel Sensor ID and Calibration Status are only shown, not imported."
          check={check}
          onClose={() => setImporting(false)}
        />
      )}
    </Stack>
  );
}
