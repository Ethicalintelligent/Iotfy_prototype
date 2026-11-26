// Stock › SIM cards (approved GPS Platform design 07-03): the dealer's SIM list (SIM Card No, IMEI
// No, dates, provider, plan, PUK, support number, status). The Add / Edit SIM Card drawer and the
// delete confirmation came from GPS Vehicle Tracking's forms/, deleted in IT-0025 while the
// product is rebuilt; the list is view-only until new forms exist.
// IT-0040: SIMs are gps.sim_card (msisdn = SIM number, iccid, plan, PUK, support number in the same
// row); the device holding a SIM is the gps.device whose sim_card_id is it.
import { useState } from 'react';
import { SearchInput, StatusChip, Table } from '@iotify/ui';
import { Toolbar } from '@iotify/app-kit';
import { useDevice, useSimCard, type SimCardRow } from '@iotify/data';

const dash = (v: string | null | undefined) => (v ? v : '—');
const day = (v: unknown) => (v ? String(v).slice(0, 10) : '');
/** Active unless the SIM is marked inactive or suspended. */
const simActive = (sim: SimCardRow) => sim.active !== false && sim.status !== 'SUSPENDED';

export function SimCards({ dealer }: { dealer: string; readOnly?: boolean }) {
  const sims = useSimCard({ owner_dealer_id: dealer }, { enabled: !!dealer });
  const units = useDevice({ owner_dealer_id: dealer }, { enabled: !!dealer });
  const [q, setQ] = useState('');

  const imeiOf = (s: SimCardRow) =>
    (units.data ?? []).find((u) => u.sim_card_id != null && u.sim_card_id === s.id)?.imei ?? null;
  const rows = [...(sims.data ?? [])]
    .filter((s) => {
      if (!q) return true;
      return [s.msisdn, s.iccid, s.provider, imeiOf(s), s.plan, s.support_no]
        .join(' ')
        .toLowerCase()
        .includes(q.toLowerCase());
    })
    .sort((a, b) => (a.id ?? 0) - (b.id ?? 0));

  return (
    <>
      <Toolbar search={<SearchInput value={q} onChange={setQ} placeholder="Search SIM cards" />} />
      <Table<SimCardRow>
        label="SIM cards"
        rows={rows}
        rowKey={(r) => String(r.id)}
        empty={sims.isLoading ? 'Loading…' : 'No SIM cards yet.'}
        columns={[
          { header: 'SIM Card No', cell: (r) => <b>{r.msisdn || r.iccid || String(r.id)}</b> },
          { header: 'IMEI No', cell: (r) => dash(imeiOf(r)) },
          { header: 'Date of Purchase', cell: (r) => dash(day(r.purchase_date)) },
          { header: 'Subscription Date', cell: (r) => dash(day(r.subscription_date)) },
          { header: 'Provider', cell: (r) => dash(r.provider) },
          { header: 'Plan', cell: (r) => dash(r.plan) },
          { header: 'Puk Code', cell: (r) => dash(r.puk_code) },
          { header: 'Support Number', cell: (r) => dash(r.support_no) },
          {
            header: 'Status',
            cell: (r) => <StatusChip status={simActive(r) ? 'Active' : 'Inactive'} />,
          },
        ]}
      />
    </>
  );
}
