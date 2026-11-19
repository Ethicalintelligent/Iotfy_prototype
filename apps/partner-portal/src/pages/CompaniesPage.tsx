// Companies: the dealer's customers and customer support. First version for Step 5; Step 8
// completes it (contacts, subscriptions, quotes…).
import { useState } from 'react';
import { Button, Card, Chip, StatusChip, Table } from '@iotify/ui';
import { useCompanies, type CompaniesRow } from '@iotify/data';
import { SupportDialog, supportAllowed, useAuth } from '@iotify/auth';

export function CompaniesPage() {
  const auth = useAuth();
  const companies = useCompanies({ dealer_id: auth.account ?? '' }, { enabled: !!auth.account });
  const [ask, setAsk] = useState<string | null>(null);
  const appsOf = (id: string) => auth.rules?.myApps(id) ?? [];
  return (
    <>
      <Table<CompaniesRow>
        label="Companies"
        rows={companies.data ?? []}
        empty={companies.isLoading ? 'Loading…' : 'No customer companies yet.'}
        columns={[
          { header: 'Company', cell: (c) => <b>{c.name}</b> },
          { header: 'Country', cell: 'country' },
          { header: 'Apps', cell: (c) => appsOf(c.id).length },
          { header: 'Status', cell: (c) => <StatusChip status={c.status} /> },
        ]}
      />
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
                  disabled={!supportAllowed(c) || !appsOf(c.id).length}
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
