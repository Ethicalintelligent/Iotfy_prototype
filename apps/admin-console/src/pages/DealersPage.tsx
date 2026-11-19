// Dealers: list, and for the chosen dealer its reseller type (EIT only) and support access.
// First version for Step 5; Step 7 completes it (subscriptions, contacts…).
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BrandLogo,
  Button,
  Card,
  Chip,
  FieldGrid,
  Field,
  Note,
  SelectField,
  Stack,
  StatusChip,
  Table,
  useToast,
} from '@iotify/ui';
import { useDealers, useUpdateRecord, type DealersRow } from '@iotify/data';
import { SupportDialog, SupportLog, brandOf, supportAllowed } from '@iotify/auth';

export function DealersPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dealers = useDealers();
  const dealer = dealers.data?.find((d) => d.id === id);
  return (
    <>
      <Table<DealersRow>
        label="Dealers"
        rows={dealers.data ?? []}
        empty={dealers.isLoading ? 'Loading…' : 'No dealers yet.'}
        onRowClick={(d) => navigate('/dealers/' + d.id)}
        columns={[
          { header: 'Dealer', cell: (d) => <b>{d.name}</b> },
          { header: 'Country', cell: 'country' },
          {
            header: 'Reseller type',
            cell: (d) => (
              <Chip tone={d.reseller_type === 'White-label reseller' ? 'blue' : 'neutral'}>
                {d.reseller_type ?? 'Reseller'}
              </Chip>
            ),
          },
          {
            header: 'Support access',
            cell: (d) =>
              supportAllowed(d) ? (
                <Chip tone="green">Until {String(d.support_access_until).slice(0, 10)}</Chip>
              ) : (
                <span className="ui-muted">Not allowed</span>
              ),
          },
          { header: 'Status', cell: (d) => <StatusChip status={d.status} /> },
        ]}
      />
      {dealer && <DealerDetail dealer={dealer} />}
    </>
  );
}

function DealerDetail({ dealer }: { dealer: DealersRow }) {
  const save = useUpdateRecord();
  const toast = useToast();
  const [ask, setAsk] = useState(false);
  const allowed = supportAllowed(dealer);
  const b = brandOf(dealer);
  return (
    <>
      <Card title={`Reseller type & branding · ${dealer.name}`}>
        <FieldGrid>
          <SelectField
            label="Reseller type"
            name="reseller_type"
            value={dealer.reseller_type ?? 'Reseller'}
            disabled={save.isPending}
            options={[
              { value: 'Reseller', label: 'Reseller — sells under EIT brand' },
              { value: 'White-label reseller', label: 'White-label reseller — own brand' },
            ]}
            // A choice like this is a button action: it saves at once.
            onChange={(v) =>
              save.mutate(
                'dealers',
                { id: dealer.id, reseller_type: v as DealersRow['reseller_type'] },
                { onError: (e) => toast(e.message) },
              )
            }
          />
          <Field label="Brand shown to this dealer's customers">
            <Stack gap={10}>
              <BrandLogo text={b.initials} color={b.color} imageUrl={b.logoUrl} />
              <b>{b.whiteLabel ? b.name : 'EIT (standard)'}</b>
            </Stack>
          </Field>
        </FieldGrid>
        <p className="ui-muted" style={{ margin: 0 }}>
          Only EIT sets the reseller type. A white-label reseller sets its own logo, name and colour
          in its Settings; its customers then see that brand in every app.
        </p>
        {save.error && <Note tone="red">{save.error.message}</Note>}
      </Card>
      <Card
        title="Support access"
        actions={
          allowed ? (
            <Chip tone="green">
              Allowed until {String(dealer.support_access_until).slice(0, 10)}
            </Chip>
          ) : (
            <Chip>Not allowed</Chip>
          )
        }
      >
        <p className="ui-muted" style={{ margin: 0 }}>
          Open this dealer's console to help them, only while they allow it (they switch it on in
          their Settings). View-only and logged.
        </p>
        <Stack>
          <Button icon="help" disabled={!allowed} onClick={() => setAsk(true)}>
            Open dealer console as support…
          </Button>
        </Stack>
        <SupportLog account={dealer.id} />
      </Card>
      {ask && <SupportDialog level="Dealer" account={dealer.id} onClose={() => setAsk(false)} />}
    </>
  );
}
