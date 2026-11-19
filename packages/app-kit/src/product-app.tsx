// A product app's menu and screens from its spec. Port of legacy xMenu / xPage
// (legacy/src/app.js ~983–1003): the spec's sections, plus "Devices & features" under the first
// section, plus an Account section (Assets, Sites & zones, Users, My subscription).
// Fleet roles see monitoring and operations only (no Reports, no Account).
import { useMemo, type ReactNode } from 'react';
import type { IconName, RailSection } from '@iotify/ui';
import { demoContext, type DemoAsset } from './demo';
import type { ProductSpec } from './spec';
import {
  AlertsScreen,
  DashboardScreen,
  MapScreen,
  ReportsScreen,
  RulesScreen,
  SpecTableScreen,
} from './screens/demo-screens';
import {
  AssetsScreen,
  ComingSoon,
  SitesScreen,
  SubscriptionScreen,
  UsersScreen,
} from './screens/record-screens';
import { DevicesFeaturesScreen } from './screens/DevicesFeaturesScreen';

const ICON: Record<string, IconName> = {
  dash: 'features',
  map: 'sites',
  floor: 'sites',
  alerts: 'bell',
  reports: 'quotes',
  rules: 'lookups',
  live: 'hardware',
  assets: 'assets',
  sites: 'sites',
  users: 'users',
  subscription: 'subs',
  trips: 'vehicles',
  drivers: 'users',
  commands: 'interfaces',
  geofences: 'sites',
};

/** Rail sections for a product app. */
export function productMenu(spec: ProductSpec, opts: { fleet?: boolean } = {}): RailSection[] {
  const sections = spec.menu.map(([heading, items], i) => ({
    heading,
    items: [
      ...items.map(([key, label]) => ({ key, label, icon: ICON[key] ?? ('lookups' as IconName) })),
      ...(i === 0 ? [{ key: 'live', label: 'Devices & features', icon: ICON.live! }] : []),
    ],
  }));
  if (opts.fleet) return sections.filter((s) => s.heading !== 'Reports');
  return [
    ...sections,
    {
      heading: 'Account',
      items: [
        { key: 'assets', label: 'Assets', icon: ICON.assets! },
        { key: 'sites', label: 'Sites & zones', icon: ICON.sites! },
        { key: 'users', label: 'Users', icon: ICON.users! },
        { key: 'subscription', label: 'My subscription', icon: ICON.subscription! },
      ],
    },
  ];
}

/** Page title and ⓘ description for a screen key. */
export function screenInfo(
  spec: ProductSpec,
  key: string,
  productName: string,
  companyName: string,
): { title: string; description: string } {
  const fixed: Record<string, { title: string; description: string }> = {
    dash: { title: 'Dashboard', description: `${productName} · ${companyName}` },
    map: { title: 'Live map', description: 'Every asset and where it is right now.' },
    floor: { title: 'Floor view', description: 'Every asset and the zone it is in right now.' },
    alerts: { title: 'Alerts', description: 'Everything that needs attention, newest first.' },
    reports: { title: 'Reports', description: 'Run now, or schedule them by email.' },
    rules: { title: 'Alert rules', description: 'When to raise an alert, and who hears about it.' },
    live: {
      title: 'Devices & features',
      description: `What ${productName} does for each of your assets, based on what you bought, the hardware fitted and your role.`,
    },
    assets: {
      title: 'Assets',
      description: 'Your vehicles, people, equipment and sites that this app tracks.',
    },
    sites: {
      title: 'Sites & zones',
      description: 'Your sites and the zones inside them (buildings, floors, rooms, areas).',
    },
    users: {
      title: 'Users',
      description:
        'People in your company who can use this app, and support access for your dealer.',
    },
    subscription: {
      title: 'My subscription',
      description: 'What your company has for this app. Your dealer manages it.',
    },
  };
  const t = spec.tables?.[key];
  return (
    fixed[key] ??
    (t
      ? { title: t.title, description: t.hint }
      : { title: 'Coming soon', description: 'This screen is being designed.' })
  );
}

export interface ProductScreenProps {
  screen: string;
  spec: ProductSpec;
  /** Product (node) id of the app. */
  product: string;
  productName: string;
  companyId: string;
  companyName: string;
  /** The company's assets this app covers (for demo activity). */
  assets: DemoAsset[];
  /** Asset types this app covers (Assets screen filter). */
  assetTypes?: Set<string>;
  roleId?: string | null;
  /** Fleet roles: only this asset group. */
  assetGroup?: string | null;
  /** View-only (fleet roles, support sessions). */
  readOnly?: boolean;
  /** Shown under the Users list (e.g. support access). */
  usersExtra?: ReactNode;
  /** Products the subscription screen lists (the app's family). */
  subscriptionProducts?: Set<string>;
  onNavigate?: (screen: string) => void;
}

/** The screen for a menu key. */
export function ProductScreen(p: ProductScreenProps) {
  const c = useMemo(
    () => demoContext(p.product + p.screen + p.companyId, p.assets),
    [p.product, p.screen, p.companyId, p.assets],
  );
  const demo = { c, companyName: p.companyName };
  switch (p.screen) {
    case 'dash':
      return (
        <DashboardScreen
          spec={p.spec}
          {...demo}
          onViewAlerts={p.onNavigate && (() => p.onNavigate!('alerts'))}
        />
      );
    case 'map':
      return <MapScreen {...demo} />;
    case 'floor':
      return <MapScreen {...demo} floor />;
    case 'alerts':
      return <AlertsScreen spec={p.spec} {...demo} />;
    case 'reports':
      return <ReportsScreen spec={p.spec} {...demo} />;
    case 'rules':
      return <RulesScreen spec={p.spec} />;
    case 'live':
      return (
        <DevicesFeaturesScreen
          companyId={p.companyId}
          product={p.product}
          roleId={p.roleId}
          assetGroup={p.assetGroup}
        />
      );
    case 'assets':
      return (
        <AssetsScreen
          companyId={p.companyId}
          assetTypes={p.assetTypes}
          assetGroup={p.assetGroup}
          readOnly={p.readOnly}
        />
      );
    case 'sites':
      return <SitesScreen companyId={p.companyId} readOnly={p.readOnly} />;
    case 'users':
      return <UsersScreen companyId={p.companyId} readOnly={p.readOnly} extra={p.usersExtra} />;
    case 'subscription':
      return <SubscriptionScreen companyId={p.companyId} products={p.subscriptionProducts} />;
    default: {
      const t = p.spec.tables?.[p.screen];
      return t ? <SpecTableScreen table={t} {...demo} /> : <ComingSoon title={p.screen} />;
    }
  }
}
