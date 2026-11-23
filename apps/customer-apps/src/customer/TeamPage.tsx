// Team: the Company Admin adds the people of their company who sign in to its apps (Company
// Admin, Fleet Manager, Fleet Supervisor), sends them their sign-in details, and deletes after
// confirm. A company always keeps at least one Company Admin. View-only in support sessions.
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, Loading } from '@iotify/ui';
import { SignInAccounts, useAuth } from '@iotify/auth';
import { CustomerShell, useCustomerContext } from './CustomerShell';

const ROLES = ['Fleet Manager', 'Company Admin', 'Fleet Supervisor'];

export function TeamPage() {
  const auth = useAuth();
  const { company, companyName, isAdmin } = useCustomerContext();

  useEffect(() => {
    document.title = `Team · ${auth.brand.name}`;
  }, [auth.brand.name]);

  if (!auth.loading && !auth.user) return <Navigate to="/" replace />;
  if (auth.loading || !auth.directory) return <Loading>Loading your team…</Loading>;
  if (!company || (!isAdmin && !auth.support)) return <Navigate to="/apps" replace />;

  return (
    <CustomerShell
      active="team"
      title="Team"
      description={`People of ${companyName} who sign in to your apps. Company Admins manage this list.`}
    >
      <Card>
        <SignInAccounts
          level="Company"
          account={company}
          roleNames={ROLES}
          keepRole="Company Admin"
          title={null}
          emptyText="No one can sign in for your company yet."
          addLabel="Person"
          canDelete
          readOnly={!!auth.support}
        />
      </Card>
    </CustomerShell>
  );
}
