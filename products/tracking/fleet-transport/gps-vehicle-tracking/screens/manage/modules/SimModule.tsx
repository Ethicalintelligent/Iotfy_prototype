// Manage › SIM Card (approved design, Desktop/vs/Manage-SIM-Card.html): the SIM cards in the
// company's devices in the design's grid, the Add SIM / Edit SIM Card drawer (shared with the
// Partner Portal, ../../../forms) and delete after confirm. Real records: core.connectivity +
// proto_vehicle.sim_details. A company sees its SIMs through its devices (core.connectivity has
// no company), so a SIM added here is put in one of the company's devices.
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
  useDeviceUnits,
  useSimDetails,
  type ConnectivityRow,
  type SimDetailsRow,
} from '@iotify/data';
import { DeleteSimModal, SimCardDrawer, simActive } from '../../../forms/SimDrawer';
import { day } from '../../../forms/lookups';
import { ManageToolbar } from '../ManageToolbar';
import type { ModuleProps } from '../modules';

interface Row {
  id: string;
  sim: ConnectivityRow;
  d?: SimDetailsRow;
  number: string;
  imei: string | null;
  active: boolean;
}

export default function SimModule({ picker, companyId, readOnly, assetGroup }: ModuleProps) {
  const on = { enabled: !!companyId };
  const units = useDeviceUnits({ company_id: companyId }, on);
  const sims = useConnectivity(undefined, on);
  const details = useSimDetails(undefined, on);
  const assets = useAssets({ company_id: companyId }, { enabled: !!companyId && !!assetGroup });
  const toast = useToast();

  const [q, setQ] = useState('');
  const [freeze, setFreeze] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const [open, setOpen] = useState<{ sim?: ConnectivityRow; view?: boolean } | null>(null);
  const [removing, setRemoving] = useState<ConnectivityRow | null>(null);

  const rows = useMemo<Row[]>(() => {
    const unitOf = new Map((units.data ?? []).map((u) => [u.id, u]));
    const groupOf = new Map((assets.data ?? []).map((a) => [a.id, a.asset_group]));
    const detailOf = new Map((details.data ?? []).map((d) => [d.connectivity_id, d]));
    return (sims.data ?? [])
      .filter((s) => {
        const u = s.device_unit_id ? unitOf.get(s.device_unit_id) : undefined;
        if (!u) return false;
        return !assetGroup || (!!u.asset_id && groupOf.get(u.asset_id) === assetGroup);
      })
      .map((s) => {
        const d = detailOf.get(s.id);
        return {
          id: s.id,
          sim: s,
          d,
          number: s.number || s.identifier || s.id,
          imei: unitOf.get(s.device_unit_id ?? '')?.imei ?? null,
          active: simActive(s, d),
        };
      })
      .sort((a, b) => a.number.localeCompare(b.number, 'en', { numeric: true }));
  }, [units.data, sims.data, details.data, assets.data, assetGroup]);

  const columns: GridColumn<Row>[] = [
    {
      key: 'number',
      header: 'SIM Card No',
      value: (r) => r.number,
      cell: (r) => <b>{r.number}</b>,
      width: 180,
    },
    { key: 'imei', header: 'IMEI No', value: (r) => r.imei, width: 170 },
    {
      key: 'purchase',
      header: 'Date of Purchase',
      value: (r) => day(r.d?.purchase_date),
      width: 170,
    },
    {
      key: 'subscription',
      header: 'Subscription Date',
      value: (r) => day(r.d?.subscription_date),
      width: 180,
    },
    { key: 'provider', header: 'Provider', value: (r) => r.sim.provider, width: 130 },
    { key: 'plan', header: 'Plan', value: (r) => r.d?.plan, width: 170 },
    { key: 'puk', header: 'Puk Code', value: (r) => r.d?.puk_code, width: 130 },
    { key: 'support', header: 'Support Number', value: (r) => r.d?.support_number, width: 160 },
    {
      key: 'status',
      header: 'Status',
      value: (r) => (r.active ? 'Active' : 'Inactive'),
      cell: (r) => <StatusChip status={r.active ? 'Active' : 'Inactive'} />,
      width: 110,
    },
  ];
  const visible = columns.filter((c) => !hidden.includes(c.key));
  const loading = !units.data || !sims.data || !details.data;
  const error = units.error ?? sims.error ?? details.error;
  const openSim = open?.sim;

  return (
    <Stack dir="col" gap={12} align="stretch">
      <ManageToolbar
        picker={picker}
        search={q}
        onSearch={setQ}
        searchPlaceholder="Search sim card..."
        freeze={freeze}
        onFreeze={setFreeze}
        columns={columns}
        hidden={hidden}
        onHidden={setHidden}
        onDownload={() => downloadCsv('sim-cards', visible, rows)}
        addLabel="Add SIM Card"
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
          label="SIM cards"
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          search={q}
          hidden={hidden}
          freeze={freeze}
          onRowClick={(r) => setOpen({ sim: r.sim, view: true })}
          empty={loading ? 'Loading SIM cards…' : 'No SIM cards in your devices yet.'}
          actions={
            readOnly
              ? undefined
              : (r) => (
                  <>
                    <IconButton
                      icon="edit"
                      label={`Edit SIM card ${r.number}`}
                      onClick={() => setOpen({ sim: r.sim })}
                    />
                    <IconButton
                      icon="trash"
                      label={`Delete SIM card ${r.number}`}
                      onClick={() => setRemoving(r.sim)}
                    />
                  </>
                )
          }
        />
      </Card>
      {open && (
        <SimCardDrawer
          key={openSim?.id ?? 'new'}
          companyId={companyId}
          sim={openSim}
          detail={
            openSim ? (details.data ?? []).find((d) => d.connectivity_id === openSim.id) : undefined
          }
          viewFirst={open.view}
          readOnly={readOnly}
          onClose={() => setOpen(null)}
        />
      )}
      {removing && (
        <DeleteSimModal
          sim={removing}
          onClose={() => setRemoving(null)}
          onDeleted={() => toast(`SIM card ${removing.number || removing.identifier} deleted.`)}
        />
      )}
    </Stack>
  );
}
