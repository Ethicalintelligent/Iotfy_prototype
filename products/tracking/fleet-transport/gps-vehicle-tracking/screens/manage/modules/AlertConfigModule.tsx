// Manage > Alert Configuration (approved design, Desktop/vs/Manage-Alert-Configuration.html):
// toolbar (picker, search, Freeze Columns, Columns, CSV, Add Alert) and one grid row per vehicle
// and alert type from proto_vehicle.alert_configs, with edit (the same drawer) and delete.
import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Button,
  DataGrid,
  HueChip,
  IconTile,
  Loading,
  Modal,
  Note,
  Stack,
  downloadCsv,
  useToast,
  type GridColumn,
} from '@iotify/ui';
import { useAlertConfigs, useDeleteRecord, type AlertConfigsRow } from '@iotify/data';
import { useFleet } from '../../../shared/useFleet';
import { ManageToolbar } from '../ManageToolbar';
import type { ModuleProps } from '../modules';
import { AlertDrawer } from '../alert-config/AlertDrawer';
import { alertType } from '../alert-config/alert-types';
import { daysText, intervalText, modeText, tillText } from '../alert-config/alert-form';

interface Row extends AlertConfigsRow {
  plate: string;
}

const time = (v: string | undefined, fallback: string) => String(v ?? fallback).slice(0, 5);

const COLUMNS: GridColumn<Row>[] = [
  { key: 'plate', header: 'Plate Number', value: (r) => r.plate, cell: (r) => <b>{r.plate}</b> },
  {
    key: 'alert',
    header: 'Alert Name',
    value: (r) => r.alert_type,
    cell: (r) => {
      const t = alertType(r.alert_type);
      return (
        <Stack gap={8} wrap={false}>
          <IconTile icon={t.icon} hue={t.hue} size="sm" variant="solid" />
          {t.name}
        </Stack>
      );
    },
  },
  {
    key: 'interval',
    header: 'Interval Time',
    value: (r) => intervalText(r.interval_value, r.interval_unit),
  },
  { key: 'till', header: 'Effective Till', value: (r) => tillText(r.effective_till) },
  {
    key: 'subscription',
    header: 'Subscription',
    value: (r) => (r.enabled === false ? 'Off' : 'On'),
    cell: (r) => (
      <HueChip hue={r.enabled === false ? 'grey' : 'green'}>
        {r.enabled === false ? 'Off' : 'On'}
      </HueChip>
    ),
  },
  { key: 'days', header: 'Days', value: (r) => daysText(r.days ?? []) },
  { key: 'start', header: 'Start Time', value: (r) => time(r.start_time, '00:00') },
  { key: 'end', header: 'End Time', value: (r) => time(r.end_time, '23:59') },
  {
    key: 'mode',
    header: 'Notification Mode',
    value: (r) => modeText(r.notify_push, r.notify_email, r.notify_sms),
  },
];

export default function AlertConfigModule(ctx: ModuleProps) {
  const { picker, companyId, readOnly } = ctx;
  const fleet = useFleet(ctx, 60_000);
  const configs = useAlertConfigs({ company_id: companyId }, { enabled: !!companyId });
  const remove = useDeleteRecord();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [freeze, setFreeze] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const [editing, setEditing] = useState<AlertConfigsRow | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const rows = useMemo<Row[]>(() => {
    const plate = new Map(fleet.vehicles.map((v) => [v.id, v.plate]));
    return (configs.data ?? [])
      .filter((c) => !ctx.assetGroup || plate.has(c.asset_id))
      .map((c) => ({ ...c, plate: plate.get(c.asset_id) ?? c.asset_id }))
      .sort(
        (a, b) =>
          a.plate.localeCompare(b.plate, 'en', { numeric: true }) ||
          a.alert_type.localeCompare(b.alert_type),
      );
  }, [configs.data, fleet.vehicles, ctx.assetGroup]);

  const error = configs.error?.message ?? fleet.error;
  return (
    <Stack dir="col" gap={12} align="stretch">
      <ManageToolbar
        picker={picker}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search plate or alert…"
        freeze={freeze}
        onFreeze={setFreeze}
        columns={COLUMNS}
        hidden={hidden}
        onHidden={setHidden}
        onDownload={() =>
          downloadCsv(
            'alert-configuration',
            COLUMNS.filter((c) => !hidden.includes(c.key)),
            rows,
          )
        }
        addLabel="Add Alert"
        onAdd={() => setEditing('new')}
        readOnly={readOnly}
      />
      {error ? (
        <Note tone="red">Could not load alert settings: {error}</Note>
      ) : fleet.loading || !configs.data ? (
        <Loading>Loading alert settings…</Loading>
      ) : (
        <DataGrid
          label="Alert configuration"
          rows={rows}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          search={search}
          hidden={hidden}
          freeze={freeze}
          empty="No alerts set up yet. Use Add Alert to choose alerts for your vehicles."
          actions={
            readOnly
              ? undefined
              : (r) => (
                  <>
                    <ActionIcon
                      icon="edit"
                      label={`Edit ${r.alert_type} for ${r.plate}`}
                      onClick={() => setEditing(r)}
                    />
                    <ActionIcon
                      icon="trash"
                      hue="red"
                      label={`Delete ${r.alert_type} for ${r.plate}`}
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
        <AlertDrawer
          key={editing === 'new' ? 'new' : editing.id}
          edit={editing === 'new' ? null : editing}
          vehicles={fleet.vehicles}
          configs={configs.data ?? []}
          companyId={companyId}
          onClose={() => setEditing(null)}
        />
      )}

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this alert rule?"
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
                  'alert_configs',
                  { id: deleting.id },
                  {
                    onSuccess: () => {
                      toast(`${deleting.alert_type} rule for ${deleting.plate} deleted`);
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
              {deleting.alert_type} alerts for <b>{deleting.plate}</b> stop. This action cannot be
              undone.
            </span>
            {remove.error && <Note tone="red">Not deleted: {remove.error.message}</Note>}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
