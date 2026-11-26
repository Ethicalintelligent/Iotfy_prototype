// The company's vehicle certificates (gps.certificates), read-only: the dealer issues them in
// the partner portal. Real data, not demo.
import { Card, EmptyState, Loading, Note, StatusChip, Table } from '@iotify/ui';
import { useCertificates } from '@iotify/data';
import { useFleetAssets } from '@iotify/app-kit';
import type { ScreenContext } from '@iotify/app-kit';

export default function CertificatesScreen({ companyId, assetGroup }: ScreenContext) {
  const assets = useFleetAssets(companyId);
  const mine = (assets.data ?? []).filter((a) => !assetGroup || a.asset_group === assetGroup);
  const ids = mine.map((a) => a.id);
  const certs = useCertificates({ asset_id: ids.map(Number) }, { enabled: ids.length > 0 });
  if (!assets.data || (ids.length > 0 && !certs.data))
    return <Loading>Loading certificates…</Loading>;
  const name = (id?: number | null) =>
    mine.find((a) => a.id === String(id))?.name ?? (id == null ? '' : String(id));
  return (
    <>
      <Card padded={false}>
        <Table
          bare
          label="Certificates"
          rows={certs.data ?? []}
          rowKey={(r) => r.id}
          columns={[
            { header: 'Vehicle', cell: (r) => <b>{name(r.asset_id)}</b> },
            { header: 'Certification', cell: 'certification' },
            { header: 'Certificate no.', cell: (r) => r.certificate_no || '—' },
            { header: 'Issued by', cell: (r) => r.issued_by || '—' },
            { header: 'Issued on', cell: (r) => r.issued_on || '—' },
            { header: 'Valid until', cell: (r) => r.valid_until || '—' },
            { header: 'Status', cell: (r) => <StatusChip status={r.status ?? ''} /> },
          ]}
          empty={
            <EmptyState icon="certs" title="No certificates yet">
              Your dealer adds a certificate when they fit an AIS 140 device.
            </EmptyState>
          }
        />
      </Card>
      <Note tone="grey">To correct a certificate, ask your dealer: they manage them.</Note>
    </>
  );
}
