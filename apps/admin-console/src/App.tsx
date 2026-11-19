// Admin console (EIT staff). Step 5: sign-in and a first Dealers page (reseller type, support).
// The rest of the console (product tree, features, hardware, pricing…) arrives in Step 7.
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { HeroList } from '@iotify/ui';
import { SignInPage, SupportBanner, UserMenu, useAuth } from '@iotify/auth';
import { AppShell } from '@iotify/app-kit';
import { DealersPage } from './pages/DealersPage';

const SECTIONS = [
  { heading: 'Business', items: [{ key: 'dealers', label: 'Dealers', icon: 'dealers' as const }] },
];

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
        onSignedIn={() => navigate('/dealers')}
      />
    );

  const active = pathname.split('/')[1] || 'dealers';
  return (
    <AppShell
      brandName="IoTIFY"
      subtitle="Platform Admin"
      sections={SECTIONS}
      active={active}
      onSelect={(k) => navigate('/' + k)}
      title="Dealers"
      description="Dealers and resellers. EIT sets each one's reseller type; white-label resellers then brand the apps for their customers."
      userMenu={<UserMenu />}
      banner={<SupportBanner />}
    >
      <Routes>
        <Route path="/dealers/:id?" element={<DealersPage />} />
        <Route path="*" element={<Navigate to="/dealers" replace />} />
      </Routes>
    </AppShell>
  );
}
