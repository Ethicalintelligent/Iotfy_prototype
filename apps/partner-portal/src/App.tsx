// Partner portal (dealers): customers, quotes, subscriptions, stock, installation, sites,
// certificates, users, compatibility and settings. Support links open the console view-only.
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { HeroList } from '@iotify/ui';
import { SignInPage, SupportBanner, SupportRoute, UserMenu, useAuth } from '@iotify/auth';
import { AppShell, CompatibilityScreen } from '@iotify/app-kit';
import { CompaniesPage } from './pages/CompaniesPage';
import { SettingsPage } from './pages/SettingsPage';
import { AssetsPage } from './pages/AssetsPage';
import { QuotesPage } from './pages/QuotesPage';
import {
  CertificatesPage,
  SitesPage,
  StockPage,
  SubscriptionsPage,
  UsersPage,
} from './pages/business';

const SECTIONS = [
  {
    heading: 'My business',
    items: [
      { key: 'companies', label: 'Companies', icon: 'companies' as const },
      { key: 'quotes', label: 'Quotes', icon: 'quotes' as const },
      { key: 'subs', label: 'Subscriptions', icon: 'subs' as const },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { key: 'stock', label: 'Stock', icon: 'stock' as const },
      { key: 'assets', label: 'Assets & Installation', icon: 'assets' as const },
      { key: 'sites', label: 'Sites & Zones', icon: 'sites' as const },
      { key: 'certs', label: 'Certificates', icon: 'certs' as const },
      { key: 'users', label: 'Users', icon: 'users' as const },
    ],
  },
  {
    heading: 'Tools',
    items: [
      { key: 'compat', label: 'Compatibility', icon: 'compat' as const },
      { key: 'settings', label: 'Settings', icon: 'roles' as const },
    ],
  },
];
const TITLES: Record<string, [string, string]> = {
  companies: [
    'Companies',
    'Your customer companies. Open a customer’s app to help them, only while they allow it.',
  ],
  quotes: [
    'Quotes',
    'Product lines are recurring; hardware lines are one-time. Accepting a quote creates the subscriptions.',
  ],
  subs: [
    'Subscriptions',
    'What you sell to your customers, and what you buy from EIT. A subscription line belongs to an asset (or a quantity before installation).',
  ],
  stock: [
    'Stock',
    'Real units with an IMEI / ICCID / serial. Install them on assets from Assets & installation.',
  ],
  assets: [
    'Assets & Installation',
    'Vehicles, generators, tanks and other things your customers track. Open one to fit a device, SIM and sensors.',
  ],
  sites: [
    'Sites & Zones',
    'Fixed areas for indoor tracking: buildings, floors, rooms. Gateways are placed in zones.',
  ],
  certs: [
    'Certificates',
    'Certificates per vehicle (e.g. AIS 140). A vehicle can’t clear its fitness certificate until its certificate is issued.',
  ],
  users: ['Users', 'People in your company who use the partner portal.'],
  compat: [
    'Compatibility',
    'Pick products: follows Product → Feature → Data point → Sensor → Interface → Device and shows what hardware works.',
  ],
  settings: ['Settings', 'Your brand (white-label resellers) and EIT support access.'],
};

export function App() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (pathname.startsWith('/support/'))
    return (
      <Routes>
        <Route path="/support/:id" element={<SupportRoute onOpened={() => '/companies'} />} />
      </Routes>
    );

  if (!auth.user)
    return (
      <SignInPage
        entry={{ app: 'partner' }}
        homePath="/"
        title="Sign in to IoTIFY Partner Portal"
        heading={
          <>
            IoTIFY <span>Partner Portal</span>
          </>
        }
        intro="For EIT dealers and resellers. Quote, sell, install and support your customers."
        hero={
          <HeroList
            items={[
              { title: 'Sell', text: 'Customers, quotes and subscriptions.' },
              { title: 'Install', text: 'Device stock, SIM cards and installations.' },
              { title: 'Support', text: 'Open a customer’s app, only when they allow it.' },
            ]}
          />
        }
        onSignedIn={() => navigate('/companies')}
      />
    );

  const active = pathname.split('/')[1] || 'companies';
  const [title, description] = TITLES[active] ?? TITLES.companies!;
  const dealerName = auth.directory?.dealers.find((d) => d.id === auth.account)?.name;
  const roleName =
    auth.directory?.roles.find((r) => r.id === auth.user?.role_id)?.name ?? 'Dealer Admin';
  return (
    <AppShell
      brandName={dealerName ?? 'IoTIFY'}
      subtitle={roleName}
      sections={SECTIONS}
      active={active}
      onSelect={(k) => navigate('/' + k)}
      title={title}
      description={description}
      userMenu={<UserMenu />}
      banner={<SupportBanner />}
    >
      <Routes>
        <Route path="/companies/:id?" element={<CompaniesPage />} />
        <Route path="/quotes/:id?" element={<QuotesPage />} />
        <Route path="/subs/:id?" element={<SubscriptionsPage />} />
        <Route path="/stock/sims/:id?" element={<StockPage />} />
        <Route path="/stock/sensors/:id?" element={<StockPage />} />
        <Route path="/stock/:id?" element={<StockPage />} />
        <Route path="/assets/:id?" element={<AssetsPage />} />
        <Route path="/sites/:id?" element={<SitesPage />} />
        <Route path="/certs/:id?" element={<CertificatesPage />} />
        <Route path="/users/:id?" element={<UsersPage />} />
        <Route
          path="/compat"
          element={<CompatibilityScreen products={auth.rules?.dealerProducts(auth.account)} />}
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/companies" replace />} />
      </Routes>
    </AppShell>
  );
}
