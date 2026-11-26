// /debug/rules: the business rules (@iotify/core) on live Neon data. For each demo company:
// the apps it can open (bought directly or through a package) and everything its
// subscriptions grant.
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, Chip, Loading, Note, PageHeader, Stack, Table } from '@iotify/ui';
import {
  useBundleRules,
  useCompany,
  useNodes,
  useSubscriptions,
  type CompanyRow,
} from '@iotify/data';
import { createRules } from '@iotify/core';

export function RulesDebug() {
  const companies = useCompany();
  const subscriptions = useSubscriptions();
  const nodes = useNodes();
  const bundleRules = useBundleRules();
  const all = [companies, subscriptions, nodes, bundleRules];
  const error = all.find((q) => q.error)?.error;
  const ready = all.every((q) => q.data);

  const rules = useMemo(
    () =>
      ready
        ? createRules({
            nodes: nodes.data!,
            bundle_rules: bundleRules.data!,
            subscriptions: subscriptions.data!,
            company: companies.data!,
          })
        : null,
    [ready, nodes.data, bundleRules.data, subscriptions.data, companies.data],
  );
  const name = (id: string) => rules?.node(id)?.name || id;

  return (
    <main
      style={{
        padding: '4px 16px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxWidth: 1100,
      }}
    >
      <PageHeader
        title="Business rules check"
        description="Runs @iotify/core on live Neon data. Apps = products bought directly or through a package. Granted = everything the subscriptions give, including what products include."
      />
      <Stack justify="space-between">
        <Chip tone="blue">@iotify/core · createRules()</Chip>
        <Link to="/">Home</Link>
      </Stack>
      {error && <Note>{error.message}</Note>}
      {!rules ? (
        <Card>
          <Loading>Reading companies, subscriptions and the product tree…</Loading>
        </Card>
      ) : (
        <Card title={`${companies.data!.length} demo companies`}>
          <Table<CompanyRow>
            bare
            label="Apps per company"
            rows={companies.data!}
            columns={[
              { header: 'Company', cell: (c) => <b>{c.name}</b> },
              { header: 'Market', cell: 'country_code' },
              {
                header: 'Apps (sign-in)',
                cell: (c) => (
                  <Stack gap={4}>
                    {rules.myApps(String(c.id)).map((n) => (
                      <Chip key={n.id} tone={n.kind === 'Package' ? 'blue' : 'green'}>
                        {n.name}
                      </Chip>
                    ))}
                  </Stack>
                ),
              },
              {
                header: 'Granted products',
                cell: (c) => {
                  const g = [...rules.companyProducts(String(c.id))];
                  return <span title={g.map(name).join(', ')}>{g.length}</span>;
                },
                align: 'right',
              },
            ]}
          />
        </Card>
      )}
    </main>
  );
}
