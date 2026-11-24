// Stock › SIM cards (approved GPS Platform design 07-03): the dealer's SIM list (SIM Card No, IMEI
// No, dates, provider, plan, PUK, support number, status). The Add / Edit SIM Card drawer and the
// delete confirmation came from GPS Vehicle Tracking's forms/, deleted in IT-0025 while the
// product is rebuilt; the list is view-only until new forms exist.
import { useState } from 'react';
import { SearchInput, StatusChip, Table } from '@iotify/ui';
import { Toolbar } from '@iotify/app-kit';
import {
  useConnectivity,
  useDeviceUnits,
  useSimDetails,
  type ConnectivityRow,
  type SimDetailsRow,
} from '@iotify/data';

const dash = (v: string | null | undefined) => (v ? v : '—');
const day = (v: unknown) => (v ? String(v).slice(0, 10) : '');
/** Active unless the SIM details say inactive (or, without details, the SIM is suspended). */
const simActive = (sim: ConnectivityRow, d?: SimDetailsRow) =>
  d ? d.active !== false : sim.status !== 'Suspended';

export function SimCards({ dealer }: { dealer: string; readOnly?: boolean }) {
  const sims = useConnectivity({ owner_dealer_id: dealer }, { enabled: !!dealer });
  const details = useSimDetails();
  const units = useDeviceUnits({ owner_dealer_id: dealer }, { enabled: !!dealer });
  const [q, setQ] = useState('');

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

  return (
    <>
      <Toolbar search={<SearchInput value={q} onChange={setQ} placeholder="Search SIM cards" />} />
      <Table<ConnectivityRow>
        label="SIM cards"
        rows={rows}
        rowKey={(r) => r.id}
        empty={sims.isLoading ? 'Loading…' : 'No SIM cards yet.'}
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
        ]}
      />
    </>
  );
}
