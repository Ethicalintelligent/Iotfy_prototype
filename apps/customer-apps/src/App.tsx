// Customer apps: one sign-in for "My apps" and every product's own sign-in page.
//   /                         common sign-in (or My apps when signed in)
//   /apps                     My apps
//   /app/:product             a product's own sign-in, then the product app
//   /d/:dealer/app/:product   the same, branded for a white-label dealer (only its customers)
//   /support/:id              a support session link (view-only)
//   /ui, /debug/*             developer pages
import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { EntryLinks, Loading } from '@iotify/ui';
import { SignInPage, SupportRoute, useAuth } from '@iotify/auth';
import { UiGallery } from './gallery/UiGallery';
import { DataDebug } from './debug/DataDebug';
import { RulesDebug } from './debug/RulesDebug';
import { MyAppsPage } from './customer/MyAppsPage';
import { ProductRoute } from './customer/ProductRoute';

export function App() {
  return (
    <Routes>
      <Route path="/ui" element={<UiGallery />} />
      <Route path="/debug/data" element={<DataDebug />} />
      <Route path="/debug/rules" element={<RulesDebug />} />
      <Route
        path="/support/:id"
        element={<SupportRoute onOpened={(s) => `/app/${s.product_id}`} />}
      />
      <Route path="/apps" element={<MyAppsPage />} />
      <Route path="/app/:product/*" element={<ProductRoute />} />
      <Route path="/d/:dealer/app/:product/*" element={<ProductRoute />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}

/** Common sign-in page. Signed in: My apps (a company with one app goes straight in). */
function Home() {
  const auth = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    document.title = 'IoTIFY Customer Apps';
  }, []);
  if (auth.user) return <Navigate to="/apps" replace />;
  const rules = auth.rules;
  const groups = new Map<string, { href: string; label: string; detail?: string }[]>();
  rules?.entryProducts().forEach((n) => {
    const top = rules.pathOf(n.id)[0]?.name ?? 'Other';
    if (!groups.has(top)) groups.set(top, []);
    groups
      .get(top)!
      .push({ href: `/app/${n.id}`, label: n.name ?? n.id, detail: n.kind ?? undefined });
  });
  return (
    <SignInPage
      entry={{ app: 'customer' }}
      homePath="/"
      title="Sign in to IoTIFY Customer Apps"
      heading={
        <>
          One platform for every <span>tracked and monitored asset.</span>
        </>
      }
      intro="Vehicles, people, equipment, sites and stock: sold through your dealer network and managed in one place."
      hero={
        auth.loading ? (
          <Loading>Loading products…</Loading>
        ) : (
          <EntryLinks
            title="Product sign-in pages"
            intro="Demo: each product has its own entry point into this platform. Customers sign in only to what they bought."
            groups={[...groups].map(([heading, links]) => ({
              heading,
              links: links.map((l) => ({
                ...l,
                onClick: (e: React.MouseEvent) => {
                  e.preventDefault();
                  navigate(l.href);
                },
              })),
            }))}
          />
        )
      }
      onSignedIn={() => navigate('/apps?from=signin')}
    />
  );
}
