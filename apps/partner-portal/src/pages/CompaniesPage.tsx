// Companies: the dealer's customers (record on a card), who can sign in for each company, and
// customer support: open a customer's app view-only, only while they allow it.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, Chip, Table } from '@iotify/ui';
import { useCompanies, useTable, type CompaniesRow } from '@iotify/data';
import { APPS, SignInAccounts, SupportDialog, supportAllowed, useAuth } from '@iotify/auth';
import { TablePage, enumOptions, type TablePageConfig } from '@iotify/app-kit';

const COMPANY_ADMIN = ['Company Admin'];

export function CompaniesPage() {
  const auth = useAuth();
  const { id } = useParams();
  const dealer = auth.account ?? '';
  const companies = useCompanies({ dealer_id: dealer }, { enabled: !!dealer });
  const users = useTable('users', { level: 'Company' });
  const [ask, setAsk] = useState<string | null>(null);
  const readOnly = !!auth.support;
  const appsOf = useCallback((cid: string) => auth.rules?.myApps(cid) ?? [], [auth.rules]);

  // A company that appears while this page is open was just added here: ask for its first
  // Company Admin straight away, so someone at the company can sign in.
  const known = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  useEffect(() => {
    if (!companies.data) return;
    const ids = new Set(companies.data.map((c) => c.id));
    if (known.current) for (const c of ids) if (!known.current.has(c)) setFresh(c);
    known.current = ids;
  }, [companies.data]);
  const done = useCallback(() => setFresh(null), []);

  const signIns = useCallback(
    (cid: string) => (users.data ?? []).filter((u) => u.account_id === cid).length,
    [users.data],
  );

  const config = useMemo<TablePageConfig<'companies'>>(
    () => ({
      table: 'companies',
      noun: 'Company',
      idPrefix: 'C',
      path: '/companies',
      filter: { dealer_id: dealer },
      label: (r) => r.name ?? r.id,
      columns: ['name', 'country', 'status'],
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
      extraColumns: [
        {
          header: 'Apps',
          cell: (c) => {
            const n = appsOf(c.id).length;
            return n ? n : <span className="ui-muted">None yet</span>;
          },
        },
        {
          header: 'Sign-in',
          cell: (c) => {
            if (!users.data) return null;
            const n = signIns(c.id);
            return n ? (
              <Chip tone="green">
                {n} account{n === 1 ? '' : 's'}
              </Chip>
            ) : (
              <Chip tone="red">No sign-in</Chip>
            );
          },
        },
      ],
      extra: (c) => (
        <>
          <span className="ui-muted">
            Apps:{' '}
            {appsOf(c.id)
              .map((n) => n.name)
              .join(', ') || 'none yet'}
          </span>
          <SignInAccounts
            level="Company"
            account={c}
            roleNames={COMPANY_ADMIN}
            intro={`People of this company who sign in to ${APPS.customer.name}. The Company Admin adds the rest of their team there. Demo: any password works.`}
            emptyText="No one can sign in for this company yet. Add a Company Admin so they can use their apps."
            addLabel="Company Admin"
            readOnly={readOnly}
            autoAdd={fresh === c.id && id === c.id}
            onAutoAddDone={done}
          />
        </>
      ),
    }),
    [dealer, appsOf, users.data, signIns, readOnly, fresh, id, done],
  );

  return (
    <>
      <TablePage config={config} readOnly={readOnly} />
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
