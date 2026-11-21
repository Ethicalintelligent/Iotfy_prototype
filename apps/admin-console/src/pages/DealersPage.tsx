// Dealers: the dealer record, its reseller type (set by EIT only; a choice like this saves at
// once) and EIT support access into the dealer console.
import { useState } from 'react';
import {
  BrandLogo,
  Button,
  Chip,
  Field,
  FieldGrid,
  Note,
  SelectField,
  Stack,
  useToast,
} from '@iotify/ui';
import { useUpdateRecord, type DealersRow } from '@iotify/data';
import { SupportDialog, SupportLog, brandOf, supportAllowed } from '@iotify/auth';
import { TablePage, enumOptions, type TablePageConfig } from '@iotify/app-kit';

const DEALERS: TablePageConfig<'dealers'> = {
  table: 'dealers',
  noun: 'Dealer',
  idPrefix: 'DL',
  path: '/dealers',
  label: (r) => r.name ?? r.id,
  columns: ['name', 'country', 'reseller_type', 'status'],
  addFields: ['name', 'country', 'contact'],
  defaults: { status: 'Active', reseller_type: 'Reseller' },
  fields: [
    { key: 'name', label: 'Name', required: true },
    { key: 'country', label: 'Country', type: 'select', options: { lookup: 'Market' } },
    { key: 'contact', label: 'Contact' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: enumOptions('dealers', 'status'),
      placeholder: null,
    },
  ],
  extra: (d) => <DealerExtras dealer={d} />,
};

export function DealersPage() {
  return <TablePage config={DEALERS} />;
}

function DealerExtras({ dealer }: { dealer: DealersRow }) {
  const save = useUpdateRecord();
  const toast = useToast();
  const [ask, setAsk] = useState(false);
  const allowed = supportAllowed(dealer);
  const b = brandOf(dealer);
  return (
    <>
      <b style={{ fontSize: 14, marginTop: 8 }}>Reseller type & branding</b>
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
          hint="Saves at once."
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
      <Note tone="grey">
        Only EIT sets the reseller type. A white-label reseller sets its own logo, name and colour
        in its Settings; its customers then see that brand in every app.
      </Note>
      <Stack justify="space-between">
        <b style={{ fontSize: 14 }}>Support access</b>
        {allowed ? (
          <Chip tone="green">Allowed until {String(dealer.support_access_until).slice(0, 10)}</Chip>
        ) : (
          <Chip>Not allowed</Chip>
        )}
      </Stack>
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
      {ask && <SupportDialog level="Dealer" account={dealer.id} onClose={() => setAsk(false)} />}
    </>
  );
}
