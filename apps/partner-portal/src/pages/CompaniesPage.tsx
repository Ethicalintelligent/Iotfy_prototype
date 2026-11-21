// Companies: the dealer's customers (record on a card), and customer support: open a customer's
// app view-only, only while they allow it.
import { useState } from 'react';
import { Button, Card, Chip, Table } from '@iotify/ui';
import { useCompanies, type CompaniesRow } from '@iotify/data';
import { SupportDialog, supportAllowed, useAuth } from '@iotify/auth';
import { TablePage, enumOptions, type TablePageConfig } from '@iotify/app-kit';

export function CompaniesPage() {
  const auth = useAuth();
  const dealer = auth.account ?? '';
  const companies = useCompanies({ dealer_id: dealer }, { enabled: !!dealer });
  const [ask, setAsk] = useState<string | null>(null);
  const appsOf = (id: string) => auth.rules?.myApps(id) ?? [];
  const config: TablePageConfig<'companies'> = {
    table: 'companies',
    noun: 'Company',
    idPrefix: 'C',
    path: '/companies',
    filter: { dealer_id: dealer },
    label: (r) => r.name ?? r.id,
    columns: ['name', 'country', 'contact', 'status'],
    addFields: ['name', 'country', 'contact'],
    defaults: { status: 'Active' },
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'country', label: 'Country (market)', type: 'select', options: { lookup: 'Market' } },
      { key: 'contact', label: 'Contact' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: enumOptions('companies', 'status'),
        placeholder: null,
      },
    ],
    extra: (c) => (
      <span className="ui-muted">
        Apps:{' '}
        {appsOf(c.id)
          .map((n) => n.name)
          .join(', ') || 'none yet'}
      </span>
    ),
  };
  return (
    <>
      <TablePage config={config} readOnly={!!auth.support} />
      <Card title="Customer support">
        <p className="ui-muted" style={{ margin: 0 }}>
          Open a customer's app to help them, only while they allow it. View-only; every session is
          logged and the customer can see the log.
        </p>
        <Table<CompaniesRow>
          bare
          label="Customer support"
          rows={companies.data ?? []}
          columns={[
            { header: 'Company', cell: (c) => <b>{c.name}</b> },
            {
              header: 'Access',
              cell: (c) =>
                supportAllowed(c) ? (
                  <Chip tone="green">Until {String(c.support_access_until).slice(0, 10)}</Chip>
                ) : (
                  <span className="ui-muted">Not allowed</span>
                ),
            },
            {
              header: '',
              align: 'right',
              cell: (c) => (
                <Button
                  size="sm"
                  data-company={c.id}
                  disabled={!supportAllowed(c) || !appsOf(c.id).length || !!auth.support}
                  onClick={() => setAsk(c.id)}
                >
                  Open as support…
                </Button>
              ),
            },
          ]}
        />
      </Card>
      {ask && <SupportDialog level="Company" account={ask} onClose={() => setAsk(null)} />}
    </>
  );
}
