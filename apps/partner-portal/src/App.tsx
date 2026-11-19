// Partner portal (dealers). Step 5: sign-in, support links, a first Companies page (customer
// support) and Settings (brand, support access). Quotes, stock, installation… arrive in Step 8.
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { HeroList } from '@iotify/ui';
import { SignInPage, SupportBanner, SupportRoute, UserMenu, useAuth } from '@iotify/auth';
import { AppShell } from '@iotify/app-kit';
import { CompaniesPage } from './pages/CompaniesPage';
import { SettingsPage } from './pages/SettingsPage';

const SECTIONS = [
  {
    heading: 'My business',
    items: [{ key: 'companies', label: 'Companies', icon: 'companies' as const }],
  },
  { heading: 'Tools', items: [{ key: 'settings', label: 'Settings', icon: 'roles' as const }] },
];
const TITLES: Record<string, { title: string; description: string }> = {
  companies: {
    title: 'Companies',
    description:
      'Your customer companies. Open a customer’s app to help them, only while they allow it.',
  },
  settings: {
    title: 'Settings',
    description: 'Your brand (white-label resellers) and EIT support access.',
  },
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
  const page = TITLES[active] ?? TITLES.companies!;
  const dealerName = auth.directory?.dealers.find((d) => d.id === auth.account)?.name;
  return (
    <AppShell
      brandName={dealerName ?? 'IoTIFY'}
      subtitle="Dealer Admin"
      sections={SECTIONS}
      active={active}
      onSelect={(k) => navigate('/' + k)}
      title={page.title}
      description={page.description}
      userMenu={<UserMenu />}
      banner={<SupportBanner />}
    >
      <Routes>
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/companies" replace />} />
      </Routes>
    </AppShell>
  );
}
