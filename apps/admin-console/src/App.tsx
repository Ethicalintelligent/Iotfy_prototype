// Admin console (EIT staff): catalogue, hardware, pricing, roles, lookups, dealers, data source.
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { HeroList } from '@iotify/ui';
import { SignInPage, SupportBanner, UserMenu, useAuth } from '@iotify/auth';
import { AppShell, DataSourceScreen, TablePage } from '@iotify/app-kit';
import { TreePage } from './pages/TreePage';
import { DealersPage } from './pages/DealersPage';
import {
  ASSET_TYPES,
  DATA_POINTS,
  FEATURES,
  HardwarePage,
  INTERFACES,
  LOOKUPS,
  NETWORKS,
  PRICE_PLANS,
  ROLES,
} from './pages/catalogue';

const SECTIONS = [
  {
    heading: 'Catalogue',
    items: [
      { key: 'tree', label: 'Product Tree', icon: 'tree' as const },
      { key: 'features', label: 'App Features', icon: 'features' as const },
      { key: 'datapoints', label: 'Data Points', icon: 'datapoints' as const },
      { key: 'interfaces', label: 'Interfaces', icon: 'interfaces' as const },
      { key: 'networks', label: 'Networks', icon: 'cloud' as const },
      { key: 'hardware', label: 'Hardware Catalogue', icon: 'hardware' as const },
      { key: 'assettypes', label: 'Asset Types', icon: 'assettypes' as const },
      { key: 'pricing', label: 'Price Plans & Rules', icon: 'pricing' as const },
      { key: 'roles', label: 'Roles & Permissions', icon: 'roles' as const },
      { key: 'lookups', label: 'Lookups', icon: 'lookups' as const },
    ],
  },
  { heading: 'Business', items: [{ key: 'dealers', label: 'Dealers', icon: 'dealers' as const }] },
  { heading: 'Tools', items: [{ key: 'sheet', label: 'Data Source', icon: 'sheet' as const }] },
];
const TITLES: Record<string, [string, string]> = {
  tree: [
    'Product Tree',
    'Groups are folders. Only products are sold, priced and given features. Each product sits once; "includes" is a link, never a copy.',
  ],
  features: [
    'App Features',
    'What a product switches on for the customer, and the data points each needs.',
  ],
  datapoints: [
    'Data Points',
    'One reading (In) or command (Out). Features need them; devices and sensors give them.',
  ],
  interfaces: [
    'Interfaces',
    'How a sensor plugs into a device: DI, DO, AI, RS485, CAN, 1-Wire, BLE, LoRaWAN.',
  ],
  networks: ['Networks', 'How devices reach the platform, and what each network can do.'],
  hardware: ['Hardware Catalogue', 'Device and sensor models: interfaces, data points and prices.'],
  assettypes: [
    'Asset Types',
    'What we track. A product applies to one or more asset types (set on the product).',
  ],
  pricing: ['Price Plans & Rules', 'Base price per product and buyer, then rules that adjust it.'],
  roles: ['Roles & Permissions', 'What each role may see and use.'],
  lookups: ['Lookups', 'The values offered in drop-downs.'],
  dealers: [
    'Dealers',
    'Dealers and resellers. EIT sets each one’s reseller type; white-label resellers brand the apps for their customers.',
  ],
  sheet: ['Data Source', 'Where the console reads and saves: the Neon database.'],
};

export function App() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (!auth.user)
    return (
      <SignInPage
        entry={{ app: 'admin' }}
        homePath="/"
        title="Sign in to IoTIFY Admin Console"
        heading={
          <>
            IoTIFY <span>Admin Console</span>
          </>
        }
        intro="For EIT staff only. Products, hardware, pricing, dealers and platform settings. Customers and dealers sign in elsewhere."
        hero={
          <HeroList
            items={[
              { title: 'Catalogue', text: 'Product tree, app features, data points and hardware.' },
              { title: 'Commercial', text: 'Pricing, dealers and their subscriptions.' },
              { title: 'Security', text: 'Every sign-in and support session is logged.' },
            ]}
          />
        }
        onSignedIn={() => navigate('/tree')}
      />
    );

  const active = pathname.split('/')[1] || 'tree';
  const [title, description] = TITLES[active] ?? TITLES.tree!;
  return (
    <AppShell
      brandName="IoTIFY"
      subtitle="Platform Admin"
      sections={SECTIONS}
      active={active}
      onSelect={(k) => navigate('/' + k)}
      title={title}
      description={description}
      userMenu={<UserMenu />}
      banner={<SupportBanner />}
    >
      <Routes>
        <Route path="/tree/:id?" element={<TreePage />} />
        <Route path="/features/:id?" element={<TablePage config={FEATURES} />} />
        <Route path="/datapoints/:id?" element={<TablePage config={DATA_POINTS} />} />
        <Route path="/interfaces/:id?" element={<TablePage config={INTERFACES} />} />
        <Route path="/networks/:id?" element={<TablePage config={NETWORKS} />} />
        <Route path="/hardware/sensors/:id?" element={<HardwarePage />} />
        <Route path="/hardware/:id?" element={<HardwarePage />} />
        <Route path="/assettypes/:id?" element={<TablePage config={ASSET_TYPES} />} />
        <Route path="/pricing/:id?" element={<TablePage config={PRICE_PLANS} />} />
        <Route path="/roles/:id?" element={<TablePage config={ROLES} />} />
        <Route path="/lookups/:id?" element={<TablePage config={LOOKUPS} />} />
        <Route path="/dealers/:id?" element={<DealersPage />} />
        <Route path="/sheet" element={<DataSourceScreen />} />
        <Route path="*" element={<Navigate to="/tree" replace />} />
      </Routes>
    </AppShell>
  );
}
