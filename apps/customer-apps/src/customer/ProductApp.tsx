// A product app: the shared AppShell and screens from @iotify/app-kit, with the company's brand,
// the app switcher (rail footer, user menu and search), notifications and asset search. The spec
// comes from the product's manifest (registry.ts); products without a folder yet use the generic one.
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, Modal, PopoverItem, PopoverSection, PopoverSeparator } from '@iotify/ui';
import { useAssetTypes, type NodesRow } from '@iotify/data';
import { SupportAccessCard, SupportBanner, UserMenu, useAuth } from '@iotify/auth';
import {
  AppShell,
  ProductScreen,
  productMenu,
  screenInfo,
  useFleetAssets,
  useFleetDevices,
  type ShellNotification,
} from '@iotify/app-kit';
import { specFor } from './registry';

export function ProductApp({ product }: { product: NodesRow }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const { dealer } = useParams();
  const { pathname } = useLocation();
  const base = dealer ? `/d/${dealer}/app/${product.id}` : `/app/${product.id}`;
  const screen = pathname.slice(base.length).replace(/^\//, '').split('/')[0] || 'dash';
  const go = (k: string) => navigate(k === 'dash' ? base : `${base}/${k}`);
  const [supportOpen, setSupportOpen] = useState(false);

  const company = auth.companyId ?? '';
  const companyName = auth.directory?.companies.find((c) => String(c.id) === company)?.name ?? '';
  const fleet = auth.role === 'fleet';
  const assetGroup = fleet ? (auth.user?.asset_group ?? null) : null;
  const rules = auth.rules;
  const spec = useMemo(() => specFor(product.id, rules), [product.id, rules]);
  const types = useMemo(
    () => rules?.productAssetTypes(product.id) ?? new Set<string>(),
    [rules, product.id],
  );
  const family = useMemo(
    () => new Set(rules?.productFamily(product.id) ?? [product.id]),
    [rules, product.id],
  );

  const assets = useFleetAssets(company);
  const assetTypes = useAssetTypes();
  const units = useFleetDevices(company);
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
      brandName={spec.railBrand ?? product.name ?? product.id}
      subtitle={auth.brand.whiteLabel ? auth.brand.name : 'IoTIFY'}
      logoText={auth.brand.initials}
      logoColor={auth.brand.color}
      logoUrl={auth.brand.logoUrl}
      sections={productMenu(spec, { fleet })}
      railLook={spec.railLook}
      railSupport={
        spec.railLook === 'grouped'
          ? {
              title: '24/7 Support',
              subtitle: 'We are here to help you!',
              action: 'Contact Support',
              onAction: () => setSupportOpen(true),
            }
          : undefined
      }
      active={screen}
      onSelect={go}
      title={info.title}
      description={info.description}
      notifications={notifications}
      railFooter={
        apps.length > 1
          ? [{ icon: 'lookups', label: 'All my apps', onClick: () => navigate('/apps') }]
          : undefined
      }
      search={(q) => [
        ...mine
          .filter((a) => `${a.name} ${a.plate_serial ?? ''}`.toLowerCase().includes(q))
          .slice(0, 6)
          .map((a) => ({
            id: 'asset:' + a.id,
            title: a.name ?? a.id,
            subtitle: 'Asset',
            icon: 'assets' as const,
            onSelect: () => go('assets'),
          })),
        ...apps
          .filter((n) => n.id !== product.id && (n.name ?? '').toLowerCase().includes(q))
          .map((n) => ({
            id: 'app:' + n.id,
            title: n.name ?? n.id,
            subtitle: 'Switch app',
            icon: 'features' as const,
            onSelect: () => navigate(`/app/${n.id}`),
          })),
      ]}
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
      <Modal
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        title="24/7 Support"
        maxWidth={420}
        footer={
          <Button variant="primary" onClick={() => setSupportOpen(false)}>
            Close
          </Button>
        }
      >
        Our support team is here around the clock. Demo: support contact details are not set up in
        this prototype yet.
      </Modal>
    </AppShell>
  );
}
