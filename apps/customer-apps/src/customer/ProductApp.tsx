// A product app (Step 5 placeholder): shell with the company's brand, the app switcher in the
// user menu, and a Users page with support access. Real product screens arrive in Steps 9–11.
import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  EmptyState,
  Note,
  PopoverItem,
  PopoverSection,
  PopoverSeparator,
  StatusChip,
  Table,
} from '@iotify/ui';
import type { NodesRow, UsersRow } from '@iotify/data';
import { SupportAccessCard, SupportBanner, UserMenu, useAuth } from '@iotify/auth';
import { AppShell } from '@iotify/app-kit';

const SECTIONS = [
  { heading: 'Monitor', items: [{ key: '', label: 'Dashboard', icon: 'datapoints' as const }] },
  { heading: 'Account', items: [{ key: 'users', label: 'Users', icon: 'users' as const }] },
];

export function ProductApp({ product }: { product: NodesRow }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const { dealer } = useParams();
  const { pathname } = useLocation();
  const base = dealer ? `/d/${dealer}/app/${product.id}` : `/app/${product.id}`;
  const sub = pathname.slice(base.length).replace(/^\//, '').split('/')[0] ?? '';
  const company = auth.companyId ?? '';
  const apps = auth.support ? [] : (auth.rules?.myApps(company) ?? []);
  const isUsers = sub === 'users';

  return (
    <AppShell
      brandName={product.name ?? product.id}
      subtitle={auth.brand.whiteLabel ? auth.brand.name : 'IoTIFY'}
      logoText={auth.brand.initials}
      logoColor={auth.brand.color}
      logoUrl={auth.brand.logoUrl}
      sections={SECTIONS}
      active={sub}
      onSelect={(k) => navigate(k ? `${base}/${k}` : base)}
      title={isUsers ? 'Users' : 'Dashboard'}
      description={
        isUsers
          ? 'People in your company who can use this app, and support access for your dealer.'
          : undefined
      }
      tools={
        <UserMenu>
          {apps.length > 0 && (
            <>
              <PopoverSeparator />
              <PopoverSection>Your apps</PopoverSection>
              {apps.map((n) => (
                <PopoverItem
                  key={n.id}
                  icon="features"
                  title={n.name}
                  selected={n.id === product.id}
                  onClick={() => navigate(`/app/${n.id}`)}
                />
              ))}
              <PopoverItem icon="lookups" title="All my apps" onClick={() => navigate('/apps')} />
            </>
          )}
        </UserMenu>
      }
      banner={<SupportBanner />}
    >
      <Routes>
        <Route path="users" element={<UsersPage />} />
        <Route
          path="*"
          element={
            <Card>
              <EmptyState icon="datapoints" title={product.name}>
                This app's screens (dashboard, live map, alerts, reports…) arrive in a later
                refactor step.
              </EmptyState>
            </Card>
          }
        />
      </Routes>
    </AppShell>
  );
}

function UsersPage() {
  const auth = useAuth();
  const company = auth.companyId ?? '';
  const users = auth.directory?.users.filter((u) => u.account_id === company) ?? [];
  const roleName = (u: UsersRow) =>
    auth.directory?.roles.find((r) => r.id === u.role_id)?.name ?? '';
  return (
    <>
      <Table<UsersRow>
        label="Users"
        rows={users}
        columns={[
          { header: 'Name', cell: (u) => <b>{u.name}</b> },
          { header: 'Role', cell: roleName },
          { header: 'Asset group', cell: 'asset_group' },
          { header: 'Status', cell: () => <StatusChip status="Active" /> },
        ]}
      />
      {auth.role === 'company' ? (
        <SupportAccessCard level="Company" account={company} />
      ) : (
        <Note tone="grey">Only company admins can change support access.</Note>
      )}
    </>
  );
}
