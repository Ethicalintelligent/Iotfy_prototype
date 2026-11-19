// My apps: the apps a company can open (bought directly or through a package).
// Right after signing in on the common page, a company with exactly one app goes straight in.
import { useEffect, useMemo } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AppGrid, AppTile, Card, EmptyState, Loading } from '@iotify/ui';
import { useAssets } from '@iotify/data';
import { SupportBanner, UserMenu, useAuth } from '@iotify/auth';
import { AppShell } from '@iotify/app-kit';

export function MyAppsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const company = auth.companyId;
  const apps = useMemo(
    () => (company && auth.rules ? auth.rules.myApps(company) : []),
    [company, auth.rules],
  );
  const assets = useAssets({ company_id: company ?? '' }, { enabled: !!company });
  const fromSignIn = params.get('from') === 'signin';

  useEffect(() => {
    document.title = `My apps · ${auth.brand.name}`;
  }, [auth.brand.name]);
  useEffect(() => {
    if (fromSignIn && apps.length === 1) navigate(`/app/${apps[0]!.id}`, { replace: true });
  }, [fromSignIn, apps, navigate]);

  if (!auth.loading && !auth.user) return <Navigate to="/" replace />;
  if (auth.loading || !auth.rules) return <Loading>Loading your apps…</Loading>;
  const companyName = auth.directory?.companies.find((c) => c.id === company)?.name ?? '';

  return (
    <AppShell
      brandName={auth.brand.whiteLabel ? auth.brand.name : 'IoTIFY'}
      subtitle={companyName}
      logoText={auth.brand.initials}
      logoColor={auth.brand.color}
      logoUrl={auth.brand.logoUrl}
      sections={[
        { heading: 'Customer', items: [{ key: 'apps', label: 'My apps', icon: 'features' }] },
      ]}
      active="apps"
      onSelect={() => navigate('/apps')}
      title="My apps"
      description={`${companyName} uses ${apps.length} app${apps.length === 1 ? '' : 's'}. Pick one to open. Each app also has its own sign-in page.`}
      tools={<UserMenu />}
      banner={<SupportBanner />}
    >
      {apps.length ? (
        <AppGrid>
          {apps.map((n) => {
            const types = auth.rules!.productAssetTypes(n.id);
            const count = (assets.data ?? []).filter((a) =>
              types.has(a.asset_type_id ?? ''),
            ).length;
            const members = n.kind === 'Package' ? auth.rules!.packageMembers(n.id).length : 0;
            return (
              <AppTile
                key={n.id}
                data-app={n.id}
                name={n.name ?? n.id}
                kind={`${n.kind}${members ? ` · ${members} products` : ''}`}
                meta={assets.data ? `${count} asset${count === 1 ? '' : 's'}` : ' '}
                onClick={() => navigate(`/app/${n.id}`)}
              />
            );
          })}
        </AppGrid>
      ) : (
        <Card>
          <EmptyState title="No active apps yet">
            {companyName} has no active apps yet. Your dealer adds subscriptions.
          </EmptyState>
        </Card>
      )}
    </AppShell>
  );
}
