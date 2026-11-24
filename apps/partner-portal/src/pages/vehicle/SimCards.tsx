// Stock › SIM cards (approved GPS Platform design 07-03): the dealer's SIM list (SIM Card No, IMEI
// No, dates, provider, plan, PUK, support number, status, actions). The Add SIM / Edit SIM Card
// drawer and the delete confirmation are shared with GPS Vehicle Tracking's Manage › SIM Card
// (@iotify-products/gps-vehicle-tracking, dealer use).
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, IconButton, SearchInput, StatusChip, Table } from '@iotify/ui';
import { Toolbar } from '@iotify/app-kit';
import { useConnectivity, useDeviceUnits, useSimDetails, type ConnectivityRow } from '@iotify/data';
import { DeleteSimModal, SimCardDrawer, simActive } from '@iotify-products/gps-vehicle-tracking';

const PATH = '/stock/sims';
const dash = (v: string | null | undefined) => (v ? v : '—');
const day = (v: unknown) => (v ? String(v).slice(0, 10) : '');

export function SimCards({ dealer, readOnly }: { dealer: string; readOnly?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const sims = useConnectivity({ owner_dealer_id: dealer }, { enabled: !!dealer });
  const details = useSimDetails();
  const units = useDeviceUnits({ owner_dealer_id: dealer }, { enabled: !!dealer });
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<ConnectivityRow | null>(null);

  const detailOf = (s: ConnectivityRow) =>
    (details.data ?? []).find((d) => d.connectivity_id === s.id);
  const imeiOf = (s: ConnectivityRow) =>
    (units.data ?? []).find((u) => u.id === s.device_unit_id)?.imei ?? null;
  const rows = [...(sims.data ?? [])]
    .filter((s) => {
      if (!q) return true;
      const d = detailOf(s);
      return [s.number, s.identifier, s.provider, imeiOf(s), d?.plan, d?.support_number]
        .join(' ')
        .toLowerCase()
        .includes(q.toLowerCase());
    })
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const editing = id ? (sims.data ?? []).find((s) => s.id === id) : undefined;

  return (
    <>
      <Toolbar search={<SearchInput value={q} onChange={setQ} placeholder="Search SIM cards" />}>
        {!readOnly && (
          <Button size="sm" variant="primary" icon="plus" onClick={() => setAdding(true)}>
            Add SIM Card
          </Button>
        )}
      </Toolbar>
      <Table<ConnectivityRow>
        label="SIM cards"
        rows={rows}
        rowKey={(r) => r.id}
        empty={sims.isLoading ? 'Loading…' : 'No SIM cards yet.'}
        onRowClick={(r) => navigate(`${PATH}/${r.id}`)}
        columns={[
          { header: 'SIM Card No', cell: (r) => <b>{r.number || r.identifier || r.id}</b> },
          { header: 'IMEI No', cell: (r) => dash(imeiOf(r)) },
          { header: 'Date of Purchase', cell: (r) => dash(day(detailOf(r)?.purchase_date)) },
          { header: 'Subscription Date', cell: (r) => dash(day(detailOf(r)?.subscription_date)) },
          { header: 'Provider', cell: (r) => dash(r.provider) },
          { header: 'Plan', cell: (r) => dash(detailOf(r)?.plan) },
          { header: 'Puk Code', cell: (r) => dash(detailOf(r)?.puk_code) },
          { header: 'Support Number', cell: (r) => dash(detailOf(r)?.support_number) },
          {
            header: 'Status',
            cell: (r) => <StatusChip status={simActive(r, detailOf(r)) ? 'Active' : 'Inactive'} />,
          },
          {
            header: 'Actions',
            align: 'right',
            cell: (r) =>
              readOnly ? null : (
                <span
                  style={{ display: 'inline-flex', gap: 4 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconButton
                    icon="edit"
                    label={`Edit SIM card ${r.number || r.identifier}`}
                    onClick={() => navigate(`${PATH}/${r.id}`)}
                  />
                  <IconButton
                    icon="trash"
                    label={`Delete SIM card ${r.number || r.identifier}`}
                    onClick={() => setRemoving(r)}
                  />
                </span>
              ),
          },
        ]}
      />
      {adding && <SimCardDrawer dealer={dealer} onClose={() => setAdding(false)} />}
      {/* wait for the SIM details, so the form starts from the saved values */}
      {editing && details.data && (
        <SimCardDrawer
          key={editing.id}
          dealer={dealer}
          sim={editing}
          detail={detailOf(editing)}
          readOnly={readOnly}
          onClose={() => navigate(PATH)}
        />
      )}
      {removing && (
        <DeleteSimModal
          sim={removing}
          onClose={() => setRemoving(null)}
          onDeleted={() => {
            setRemoving(null);
            if (id === removing.id) navigate(PATH);
          }}
        />
      )}
    </>
  );
}
