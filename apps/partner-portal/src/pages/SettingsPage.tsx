// Settings: the dealer's brand (white-label resellers only) and EIT support access.
// Editing model: read-only until Edit; Save writes; Cancel reverts.
import { useState } from 'react';
import {
  BrandLogo,
  Button,
  Card,
  ColorField,
  Field,
  FieldGrid,
  FileField,
  Note,
  Stack,
  TextField,
  Subhead,
} from '@iotify/ui';
import { useUpdateRecord, type DealersRow } from '@iotify/data';
import { SupportAccessCard, appLink, brandOf, isWhiteLabel, useAuth } from '@iotify/auth';

const MAX_LOGO_BYTES = 150 * 1024;
type BrandFields = Pick<DealersRow, 'brand_name' | 'brand_color' | 'brand_logo'>;

export function SettingsPage() {
  const auth = useAuth();
  const dealer = auth.directory?.dealers.find((d) => d.id === auth.account);
  if (!dealer) return null;
  return (
    <>
      <BrandCard dealer={dealer} />
      <SupportAccessCard level="Dealer" account={dealer.id} />
    </>
  );
}

function BrandCard({ dealer }: { dealer: DealersRow }) {
  const auth = useAuth();
  const save = useUpdateRecord();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<BrandFields>({});
  const [logoError, setLogoError] = useState<string | null>(null);
  const wl = isWhiteLabel(dealer);
  const shown = editing ? { ...dealer, ...draft } : dealer;
  const b = brandOf(shown);
  const rules = auth.rules;
  const products = rules
    ? rules.entryProducts().filter((n) => rules.dealerProducts(dealer.id)?.has(n.id))
    : [];

  const start = () => {
    setDraft({
      brand_name: dealer.brand_name ?? '',
      brand_color: dealer.brand_color ?? '#2B6CB0',
      brand_logo: dealer.brand_logo ?? null,
    });
    setLogoError(null);
    save.reset();
    setEditing(true);
  };
  const readLogo = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (f.size > MAX_LOGO_BYTES) {
      setLogoError(`The logo is ${Math.round(f.size / 1024)} KB. Use one up to 150 KB.`);
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      setLogoError(null);
      setDraft((d) => ({ ...d, brand_logo: String(r.result) }));
    };
    r.readAsDataURL(f);
  };

  return (
    <Card
      title="Brand"
      actions={
        wl &&
        (editing ? (
          <Stack gap={8}>
            <Button onClick={() => setEditing(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={save.isPending}
              onClick={() =>
                save.mutate(
                  'dealers',
                  { id: dealer.id, ...draft, brand_name: draft.brand_name?.trim() || null },
                  { onSuccess: () => setEditing(false) },
                )
              }
            >
              {save.isPending ? 'Saving…' : save.error ? 'Try again' : 'Save'}
            </Button>
          </Stack>
        ) : (
          <Button icon="edit" onClick={start}>
            Edit
          </Button>
        ))
      }
    >
      {!wl ? (
        <p className="ui-muted" style={{ margin: 0 }}>
          You sell under the EIT brand. To use your own logo and name, ask EIT to make you a
          white-label reseller.
        </p>
      ) : (
        <>
          <FieldGrid>
            <TextField
              label="Brand name"
              name="brand_name"
              value={shown.brand_name}
              placeholder={dealer.name ?? ''}
              readOnly={!editing}
              onChange={(v) => setDraft((d) => ({ ...d, brand_name: v }))}
            />
            <ColorField
              label="Brand colour"
              name="brand_color"
              value={shown.brand_color || '#2B6CB0'}
              readOnly={!editing}
              onChange={(v) => setDraft((d) => ({ ...d, brand_color: v }))}
            />
            <FileField
              label="Logo (PNG, SVG or JPEG, up to 150 KB)"
              name="brand_logo"
              accept="image/png,image/svg+xml,image/jpeg"
              current={shown.brand_logo ? 'Logo uploaded' : 'No logo'}
              readOnly={!editing}
              onFiles={readLogo}
            />
            <Field label="Preview">
              <Stack gap={10}>
                <BrandLogo text={b.initials} color={b.color} imageUrl={b.logoUrl} />
                <b>{b.name}</b>
              </Stack>
            </Field>
          </FieldGrid>
          {logoError && <Note>{logoError}</Note>}
          {save.error && <Note tone="red">{save.error.message}</Note>}
          <Subhead>Your branded sign-in pages</Subhead>
          <p className="ui-muted" style={{ margin: 0 }}>
            Give these to your customers. They show your brand and only your customers.
          </p>
          <ul
            style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}
            aria-label="Branded sign-in pages"
          >
            {products.map((n) => {
              const path = `/d/${dealer.id}/app/${n.id}`;
              return (
                <li key={n.id}>
                  <a href={appLink('customer', path)} target="_blank" rel="noopener">
                    {n.name}
                  </a>{' '}
                  <code className="ui-small ui-small--xs">
                    {path}
                  </code>
                </li>
              );
            })}
            {!products.length && <li className="ui-muted">No products yet.</li>}
          </ul>
        </>
      )}
    </Card>
  );
}
