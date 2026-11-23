// Manage > Operator (approved design, Desktop/vs/Manage-Operator.html): toolbar (picker, search,
// Freeze Columns, Columns, CSV, Add Operator) and the operators grid with edit and delete.
// Real data: proto_vehicle.operators; Plate No is the vehicle whose vehicle_details.operator_id is
// the operator. Deleting an operator unassigns its vehicles in the same transaction (operator_id
// and the older operator_name text are cleared, so no screen still shows the deleted name).
import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Button,
  DataGrid,
  HueChip,
  Loading,
  Modal,
  Note,
  Stack,
  downloadCsv,
  useToast,
  type GridColumn,
} from '@iotify/ui';
import {
  useAssets,
  useCompanies,
  useOperators,
  useSaveBatch,
  useVehicleDetails,
  type OperatorsRow,
} from '@iotify/data';
import { ManageToolbar } from '../ManageToolbar';
import type { ModuleProps } from '../modules';
import { OperatorDrawer } from '../operator/OperatorDrawer';
import { dateText } from '../../../shared/format';

interface Row extends OperatorsRow {
  /** Plates of the vehicles this operator drives. */
  plates: string[];
  /** Their asset ids. */
  assetIds: string[];
}

/** "31 Mar 2028" from a stored date. */
const day = (v: string | null | undefined) => {
  if (!v) return null;
  const d = new Date(String(v).slice(0, 10) + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? String(v) : dateText(d);
};

const COLUMNS: GridColumn<Row>[] = [
  { key: 'name', header: 'Operator Name', value: (r) => r.name, cell: (r) => <b>{r.name}</b> },
  { key: 'tag', header: 'Tag Id', value: (r) => r.tag_id },
  { key: 'email', header: 'Email Address', value: (r) => r.email },
  { key: 'contact', header: 'Contact No', value: (r) => r.contact_no },
  { key: 'emergency', header: 'Emergency Contact No', value: (r) => r.emergency_contact_no },
  { key: 'license', header: 'License No', value: (r) => r.license_number },
  { key: 'expiry', header: 'License Expiry Date', value: (r) => day(r.license_expiry) },
  { key: 'address', header: 'Address Line 1', value: (r) => r.address_line1 },
  { key: 'branch', header: 'Branch Location', value: (r) => r.branch_location },
  { key: 'city', header: 'City', value: (r) => r.city },
  { key: 'plate', header: 'Plate No', value: (r) => r.plates.join(', ') },
  { key: 'country', header: 'Country', value: (r) => r.country },
  {
    key: 'status',
    header: 'Status',
    value: (r) => r.status ?? 'Active',
    cell: (r) => (
      <HueChip hue={r.status === 'Inactive' ? 'grey' : 'green'}>{r.status ?? 'Active'}</HueChip>
    ),
  },
];

export default function OperatorModule({ picker, companyId, readOnly }: ModuleProps) {
  const on = { enabled: !!companyId };
  const operators = useOperators({ company_id: companyId }, on);
  const assets = useAssets({ company_id: companyId }, on);
  const details = useVehicleDetails(undefined, on);
  const company = useCompanies({ id: companyId }, on);
  const remove = useSaveBatch();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [freeze, setFreeze] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const [editing, setEditing] = useState<OperatorsRow | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const rows = useMemo<Row[]>(() => {
    const plate = new Map(
      (assets.data ?? []).map((a) => [a.id, a.plate_serial || a.name || a.id] as const),
    );
    const driven = new Map<string, string[]>();
    for (const d of details.data ?? []) {
      if (!d.operator_id || !plate.has(d.asset_id)) continue;
      driven.set(d.operator_id, [...(driven.get(d.operator_id) ?? []), d.asset_id]);
    }
    return (operators.data ?? [])
      .map((o) => {
        const assetIds = driven.get(o.id) ?? [];
        return { ...o, assetIds, plates: assetIds.map((id) => plate.get(id)!).sort() };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
  }, [operators.data, assets.data, details.data]);

  const error = operators.error ?? assets.error ?? details.error;
  const loading = !operators.data || !assets.data || !details.data;

  return (
    <Stack dir="col" gap={12} align="stretch">
      <ManageToolbar
        picker={picker}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search operator…"
        freeze={freeze}
        onFreeze={setFreeze}
        columns={COLUMNS}
        hidden={hidden}
        onHidden={setHidden}
        onDownload={() =>
          downloadCsv(
            'operators',
            COLUMNS.filter((c) => !hidden.includes(c.key)),
            rows,
          )
        }
        addLabel="Add Operator"
        onAdd={() => setEditing('new')}
        readOnly={readOnly}
      />
      {error ? (
        <Note tone="red">Could not load operators: {error.message}</Note>
      ) : loading ? (
        <Loading>Loading operators…</Loading>
      ) : (
        <DataGrid
          label="Operators"
          rows={rows}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          search={search}
          hidden={hidden}
          freeze={freeze}
          empty="No operators yet. Add your first operator."
          actions={
            readOnly
              ? undefined
              : (r) => (
                  <>
                    <ActionIcon
                      icon="edit"
                      label={`Edit ${r.name}`}
                      onClick={() => setEditing(r)}
                    />
                    <ActionIcon
                      icon="trash"
                      hue="red"
                      label={`Delete ${r.name}`}
                      onClick={() => {
                        remove.reset();
                        setDeleting(r);
                      }}
                    />
                  </>
                )
          }
        />
      )}

      {editing && (
        <OperatorDrawer
          key={editing === 'new' ? 'new' : editing.id}
          record={editing === 'new' ? null : editing}
          companyId={companyId}
          country={company.data?.[0]?.country ?? 'Saudi Arabia'}
          operators={operators.data ?? []}
          onClose={() => setEditing(null)}
        />
      )}

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this operator?"
        maxWidth={420}
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() =>
                deleting &&
                remove.mutate(
                  {
                    updates: [
                      {
                        table: 'vehicle_details',
                        rows: deleting.assetIds.map((id) => ({
                          asset_id: id,
                          operator_id: null,
                          operator_name: null,
                        })),
                      },
                    ],
                    deletes: [{ table: 'operators', keys: [{ id: deleting.id }] }],
                  },
                  {
                    onSuccess: () => {
                      toast(`${deleting.name} deleted`);
                      setDeleting(null);
                    },
                  },
                )
              }
            >
              {remove.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        }
      >
        {deleting && (
          <Stack dir="col" gap={10} align="stretch">
            <span>
              This will permanently remove <b>{deleting.name}</b> from your operators. This action
              cannot be undone.
            </span>
            {deleting.plates.length > 0 && (
              <Note>
                {deleting.plates.join(', ')} will be left without an operator. You can pick a new
                one in Manage › Vehicle.
              </Note>
            )}
            {remove.error && <Note tone="red">Not deleted: {remove.error.message}</Note>}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
