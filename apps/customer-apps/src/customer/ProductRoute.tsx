// /app/:product and /d/:dealer/app/:product: the product's own sign-in page; once signed in,
// the product app, or "not in your apps" when the company doesn’t have it. The sign-in page shows
// the product’s scene (its manifest names it; drawings in @iotify/illustrations) and features.
import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AppTile,
  BrandLogo,
  Button,
  Card,
  EmptyState,
  HeroChips,
  Loading,
  Stack,
} from '@iotify/ui';
import { useFeatures, useProductFeatures } from '@iotify/data';
import { SignInPage, useAuth } from '@iotify/auth';
import { SignInScene } from '@iotify/illustrations';
import { ProductApp } from './ProductApp';
import { sceneFor } from './registry';

export function ProductRoute() {
  const { product = '', dealer } = useParams();
  const { pathname } = useLocation();
  const auth = useAuth();
  const node = auth.directory?.nodes.find((n) => n.id === product);
  const entryIds = new Set(auth.rules?.entryProducts().map((n) => n.id) ?? []);

  useEffect(() => {
    if (node)
      document.title = `${node.name} · ${auth.user ? auth.brand.name : auth.brandFor(dealer).name}`;
  }, [node, auth, dealer]);

  if (auth.loading || !auth.directory) return <Loading>Loading…</Loading>;
  if (!node || !entryIds.has(product))
    return (
      <Card style={{ margin: 24 }}>
        <EmptyState title="No such app">There is no app at this address.</EmptyState>
      </Card>
    );

  if (!auth.user) {
    // The sign-in page this person used: signing out comes back here.
    const home = pathname
      .split('/')
      .slice(0, dealer ? 5 : 3)
      .join('/');
    return (
      <SignInPage
        entry={{ app: 'customer', product, dealer }}
        homePath={home}
        title={`Sign in to ${node.name}`}
        heading={<span>{node.name}</span>}
        intro={`${node.kind} · ${auth.rules?.groupPath(product) ?? ''}`}
        hero={<ProductHero product={product} />}
        emptyAccounts={`No company has bought ${node.name} yet. A dealer adds the subscription; its users then appear here.`}
      />
    );
  }

  const company = auth.companyId ?? '';
  const has = auth.support
    ? auth.support.session.product_id === product
    : (auth.rules?.companyApps(company).has(product) ?? false);
  return has ? <ProductApp product={node} /> : <NotInYourApps productName={node.name ?? product} />;
}

/**
 * The sign-in panel's picture: the product's scene and up to six of its features (a package's
 * members and add-ons; an edition's base too). Port of legacy prodHero (legacy/src/app.js ~1030).
 */
function ProductHero({ product }: { product: string }) {
  const { rules } = useAuth();
  const features = useFeatures();
  const links = useProductFeatures();
  const names = useMemo(() => {
    if (!rules || !features.data || !links.data) return [];
    const ids = new Set(
      rules.isPackage(product)
        ? rules.productFamily(product)
        : rules.isEdition(product)
          ? [product, rules.baseOf(product)]
          : [product],
    );
    const fids = new Set(
      links.data.filter((l) => ids.has(l.product_id ?? '')).map((l) => l.feature_id),
    );
    return features.data
      .filter((f) => fids.has(f.id) && f.status !== 'Inactive')
      .map((f) => f.name ?? f.id)
      .slice(0, 6);
  }, [rules, features.data, links.data, product]);
  return (
    <Stack gap={16}>
      <SignInScene name={sceneFor(product, rules)} />
      <HeroChips label="Features" items={names} />
    </Stack>
  );
}

/** A product the company doesn't have: say so, stay signed in, offer the company's apps. */
function NotInYourApps({ productName }: { productName: string }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const company = auth.companyId ?? '';
  const companyName = auth.directory?.companies.find((c) => c.id === company)?.name ?? '';
  const apps = auth.rules?.myApps(company) ?? [];
  return (
    <section style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Card style={{ maxWidth: 520, width: '100%', padding: 28 }}>
        <Stack gap={10}>
          <BrandLogo
            text={auth.brand.initials}
            color={auth.brand.color}
            imageUrl={auth.brand.logoUrl}
          />
          <b style={{ fontSize: 16 }}>{productName}</b>
        </Stack>
        <h2 style={{ margin: 0 }} data-testid="noapp">
          {companyName} doesn't have {productName}
        </h2>
        <p className="ui-muted" style={{ margin: 0 }}>
          You're signed in as {auth.user?.name}. Ask your dealer if you'd like to add this product,
          or open one of your apps.
        </p>
        <Stack dir="col" gap={8}>
          {apps.map((n) => (
            <AppTile
              key={n.id}
              compact
              data-app={n.id}
              name={n.name ?? n.id}
              onClick={() => navigate(`/app/${n.id}`)}
            />
          ))}
        </Stack>
        <Stack justify="space-between">
          <Button onClick={() => navigate('/apps')}>All my apps</Button>
          <Button onClick={() => auth.signOut()}>Sign in as someone else</Button>
        </Stack>
      </Card>
    </section>
  );
}
