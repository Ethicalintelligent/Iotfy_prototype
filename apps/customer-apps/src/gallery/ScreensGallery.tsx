// /ui/screens: every shared screen from @iotify/app-kit inside the full AppShell, with
// Sample Company A's real records from Neon and demo activity. View-only: Edit works, but Save
// is refused, so the gallery never changes the database.
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Note } from '@iotify/ui';
import { ReadOnlyData, useAssetTypes, useAssets, useCompanies } from '@iotify/data';
import { AppShell, ProductScreen, productMenu, screenInfo, useCoreRules } from '@iotify/app-kit';
import { SAMPLE_SPEC } from './sampleSpec';

const COMPANY = 'C1';
const PRODUCT = 'N004';

export function ScreensGallery() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const screen = params.get('screen') || 'dash';
  const companies = useCompanies();
  const assets = useAssets({ company_id: COMPANY });
  const assetTypes = useAssetTypes();
  const { rules } = useCoreRules();
  const companyName = companies.data?.find((c) => c.id === COMPANY)?.name ?? 'Sample Company A';
  const types = useMemo(() => rules?.productAssetTypes(PRODUCT) ?? new Set<string>(), [rules]);
  const demoAssets = useMemo(
    () =>
      (assets.data ?? [])
        .filter((a) => types.has(a.asset_type_id ?? ''))
        .map((a) => ({
          id: a.id,
          name: a.name ?? a.id,
          detail: assetTypes.data?.find((t) => t.id === a.asset_type_id)?.name ?? '',
        })),
    [assets.data, types, assetTypes.data],
  );
  const info = screenInfo(SAMPLE_SPEC, screen, 'GPS Vehicle Tracking', companyName);
  const go = (k: string) => setParams({ screen: k });

  return (
    <ReadOnlyData reason="Screens gallery: changes are not saved.">
      <AppShell
        brandName="Screens gallery"
        subtitle="@iotify/app-kit"
        logoText="UI"
        sections={productMenu(SAMPLE_SPEC)}
        active={screen}
        onSelect={go}
        railFooter={[{ icon: 'back', label: 'Component gallery', onClick: () => navigate('/ui') }]}
        title={info.title}
        description={info.description}
        notifications={[
          {
            id: 'n1',
            title: 'Certificate pending',
            subtitle: 'Demo: a fitness certificate is waiting',
            tone: 'red',
            onClick: () => go('assets'),
          },
          {
            id: 'n2',
            title: 'No device fitted',
            subtitle: 'Demo: an asset has no tracker yet',
            tone: 'amber',
            onClick: () => go('live'),
          },
        ]}
        search={(q) =>
          demoAssets
            .filter((a) => a.name.toLowerCase().includes(q))
            .slice(0, 6)
            .map((a) => ({
              id: a.id,
              title: a.name,
              subtitle: 'Asset',
              icon: 'assets' as const,
              onSelect: () => go('assets'),
            }))
        }
        banner={
          <Note tone="grey" data-testid="gallery-note">
            Screens gallery: {companyName}'s records from Neon, demo activity, view-only. Edit
            works; Save is refused, so nothing changes.
          </Note>
        }
      >
        <ProductScreen
          screen={screen}
          spec={SAMPLE_SPEC}
          product={PRODUCT}
          productName="GPS Vehicle Tracking"
          companyId={COMPANY}
          companyName={companyName}
          assets={demoAssets}
          assetTypes={types}
          onNavigate={go}
        />
      </AppShell>
    </ReadOnlyData>
  );
}
