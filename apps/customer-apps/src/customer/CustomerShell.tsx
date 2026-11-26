// The frame of the customer's own pages (My apps, Team): rail, header with the company name and
// the person's role. Team shows only for Company Admins.
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { SupportBanner, UserMenu, useAuth } from '@iotify/auth';
import { AppShell } from '@iotify/app-kit';

/** The signed-in person's company, role name and whether they manage the team. */
export function useCustomerContext() {
  const auth = useAuth();
  const dir = auth.directory;
  const company = dir?.companies.find((c) => String(c.id) === auth.companyId);
  const roleName = dir?.roles.find((r) => r.id === auth.user?.role_id)?.name ?? '';
  return {
    company,
    companyName: company?.name ?? '',
    dealer: dir?.dealers.find((d) => d.id === company?.dealer_id),
    roleName,
    /** Company Admins (not fleet roles, not support sessions) manage the team. */
    isAdmin: auth.role === 'company' && roleName === 'Company Admin',
  };
}

export function CustomerShell({
  active,
  title,
  description,
  children,
}: {
  active: 'apps' | 'team';
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  const auth = useAuth();
  const navigate = useNavigate();
  const { companyName, roleName, isAdmin } = useCustomerContext();
  const items: { key: string; label: string; icon: 'features' | 'users' }[] = [
    { key: 'apps', label: 'My apps', icon: 'features' },
  ];
  if (isAdmin || auth.support) items.push({ key: 'team', label: 'Team', icon: 'users' });
  return (
    <AppShell
      brandName={auth.brand.whiteLabel ? auth.brand.name : 'IoTIFY'}
      subtitle={companyName}
      logoText={auth.brand.initials}
      logoColor={auth.brand.color}
      logoUrl={auth.brand.logoUrl}
      sections={[{ heading: 'Customer', items }]}
      active={active}
      onSelect={(k) => navigate(k === 'team' ? '/team' : '/apps')}
      title={title}
      meta={
        companyName && (
          <span className="ui-muted">
            {companyName}
            {roleName ? ` · ${roleName}` : ''}
          </span>
        )
      }
      description={description}
      userMenu={<UserMenu />}
      banner={<SupportBanner />}
    >
      {children}
    </AppShell>
  );
}
