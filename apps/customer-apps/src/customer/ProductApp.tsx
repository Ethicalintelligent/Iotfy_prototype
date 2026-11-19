// A product app: the shared AppShell and screens from @iotify/app-kit, with the company's brand,
// the app switcher in the user menu, notifications and asset search. Until a product brings its
// own spec (Steps 10–11) it uses the generic one.
import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { PopoverItem, PopoverSection, PopoverSeparator } from '@iotify/ui';
import { useAssetTypes, useAssets, useDeviceUnits, type NodesRow } from '@iotify/data';
import { SupportAccessCard, SupportBanner, UserMenu, useAuth } from '@iotify/auth';
import {
  AppShell,
  GENERIC_SPEC,
  ProductScreen,
  productMenu,
  screenInfo,
  type ShellNotification,
} from '@iotify/app-kit';

export function ProductApp({ product }: { product: NodesRow }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const { dealer } = useParams();
  const { pathname } = useLocation();
  const base = dealer ? `/d/${dealer}/app/${product.id}` : `/app/${product.id}`;
  const screen = pathname.slice(base.length).replace(/^\//, '').split('/')[0] || 'dash';
  const go = (k: string) => navigate(k === 'dash' ? base : `${base}/${k}`);

  const company = auth.companyId ?? '';
  const companyName = auth.directory?.companies.find((c) => c.id === company)?.name ?? '';
  const fleet = auth.role === 'fleet';
  const assetGroup = fleet ? (auth.user?.asset_group ?? null) : null;
  const spec = GENERIC_SPEC;
  const rules = auth.rules;
  const types = useMemo(
    () => rules?.productAssetTypes(product.id) ?? new Set<string>(),
    [rules, product.id],
  );
  const family = useMemo(
    () => new Set(rules?.productFamily(product.id) ?? [product.id]),
    [rules, product.id],
  );

  const assets = useAssets({ company_id: company }, { enabled: !!company });
  const assetTypes = useAssetTypes();
  const units = useDeviceUnits({ company_id: company }, { enabled: !!company });
  const mine = useMemo(
    () =>
      (assets.data ?? []).filter(
        (a) => types.has(a.asset_type_id ?? '') && (!assetGroup || a.asset_group === assetGroup),
      ),
    [assets.data, types, assetGroup],
  );
  const demoAssets = useMemo(
    () =>
      mine.map((a) => ({
        id: a.id,
        name: a.name ?? a.id,
        detail: assetTypes.data?.find((t) => t.id === a.asset_type_id)?.name ?? '',
      })),
    [mine, assetTypes.data],
  );
  const notifications: ShellNotification[] = mine
    .filter(
      (a) =>
        a.status === 'Active' &&
        !(units.data ?? []).some((u) => u.asset_id === a.id && u.status === 'Installed'),
    )
    .map((a) => ({
      id: 'nodev:' + a.id,
      title: 'No device fitted',
      subtitle: a.name ?? a.id,
      tone: 'amber' as const,
      onClick: () => go('live'),
    }));

  const apps = auth.support ? [] : (rules?.myApps(company) ?? []);
  const info = screenInfo(spec, screen, product.name ?? product.id, companyName);
  const readOnly = fleet || !!auth.support;

  return (
    <AppShell
      brandName={product.name ?? product.id}
      subtitle={auth.brand.whiteLabel ? auth.brand.name : 'IoTIFY'}
      logoText={auth.brand.initials}
      logoColor={auth.brand.color}
      logoUrl={auth.brand.logoUrl}
      sections={productMenu(spec, { fleet })}
      active={screen}
      onSelect={go}
      title={info.title}
      description={info.description}
      notifications={notifications}
      search={(q) =>
        mine
          .filter((a) => `${a.name} ${a.plate_serial ?? ''}`.toLowerCase().includes(q))
          .slice(0, 6)
          .map((a) => ({
            id: 'asset:' + a.id,
            title: a.name ?? a.id,
            subtitle: 'Asset',
            icon: 'assets' as const,
            onSelect: () => go('assets'),
          }))
      }
      userMenu={
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
      <ProductScreen
        screen={screen}
        spec={spec}
        product={product.id}
        productName={product.name ?? product.id}
        companyId={company}
        companyName={companyName}
        assets={demoAssets}
        assetTypes={types}
        roleId={fleet ? auth.user?.role_id : null}
        assetGroup={assetGroup}
        readOnly={readOnly}
        subscriptionProducts={family}
        usersExtra={
          auth.role === 'company' ? <SupportAccessCard level="Company" account={company} /> : null
        }
        onNavigate={go}
      />
    </AppShell>
  );
}
