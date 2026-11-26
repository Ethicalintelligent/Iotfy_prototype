// My apps: the apps a company can open (bought directly or through a package).
// Right after signing in on the common page, a company with exactly one app goes straight in.
// A Company Admin alone in their team gets a welcome note pointing to Team.
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AppGrid, AppTile, Button, Card, EmptyState, Loading, Note, Stack } from '@iotify/ui';
import { useAppUser, useTrackedAsset } from '@iotify/data';
import { useAuth } from '@iotify/auth';
import { CustomerShell, useCustomerContext } from './CustomerShell';

const WELCOME_KEY = 'iotify.welcomeDismissed.';

export function MyAppsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const company = auth.companyId;
  const { companyName, dealer, isAdmin } = useCustomerContext();
  const apps = useMemo(
    () => (company && auth.rules ? auth.rules.myApps(company) : []),
    [company, auth.rules],
  );
  const assets = useTrackedAsset({ company_id: Number(company) }, { enabled: !!company });
  const team = useAppUser({ company_id: Number(company) }, { enabled: !!company });
  const fromSignIn = params.get('from') === 'signin';
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(WELCOME_KEY + company) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.title = `My apps · ${auth.brand.name}`;
  }, [auth.brand.name]);
  useEffect(() => {
    if (fromSignIn && apps.length === 1) navigate(`/app/${apps[0]!.id}`, { replace: true });
  }, [fromSignIn, apps, navigate]);

  if (!auth.loading && !auth.user) return <Navigate to="/" replace />;
  if (auth.loading || !auth.rules) return <Loading>Loading your apps…</Loading>;

  const welcome =
    isAdmin && !auth.support && !dismissed && team.data?.length === 1 ? (
      <Note tone="green">
        <Stack justify="space-between" wrap>
          <span>
            <b>Welcome, {auth.user?.name}.</b> Add the people who'll use your apps in{' '}
            <b>Team</b>.
          </span>
          <Stack gap={8}>
            <Button size="sm" variant="primary" onClick={() => navigate('/team')}>
              Go to Team
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                try {
                  localStorage.setItem(WELCOME_KEY + company, '1');
                } catch {
                  /* private window: hide for this visit only */
                }
                setDismissed(true);
              }}
            >
              Hide
            </Button>
          </Stack>
        </Stack>
      </Note>
    ) : null;

  return (
    <CustomerShell
      active="apps"
      title="My apps"
      description={`${companyName} uses ${apps.length} app${apps.length === 1 ? '' : 's'}. Pick one to open. Each app also has its own sign-in page.`}
    >
      <Stack dir="col" gap={14} align="stretch">
        {welcome}
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
            <EmptyState title="No apps yet">
              {dealer ? (
                <>
                  Your dealer, <b>{dealer.name}</b>, adds apps when you buy them.
                  {dealer.contact ? (
                    <>
                      <br />
                      Contact: {dealer.contact}
                    </>
                  ) : null}
                </>
              ) : (
                <>{companyName} has no active apps yet. Your dealer adds subscriptions.</>
              )}
            </EmptyState>
          </Card>
        )}
      </Stack>
    </CustomerShell>
  );
}
