// Devices & features: for each asset, what this app does for it, based on what the company
// bought (Paid), the hardware fitted (Possible) and the user's role (Allowed), with the reason
// when something doesn't work. Add-ons the company hasn't bought are folded into one line.
// Port of legacy pLive (legacy/src/app.js ~1670).
import { Button, Card, Chip, EmptyState, Loading, Note, SmallText, useToast } from '@iotify/ui';
import { useCoreRules } from '../rules-data';

export interface DevicesFeaturesProps {
  companyId: string;
  /** The product app (a package shows its members' features). */
  product: string;
  /** The signed-in user's role (Allowed). Omit for company admins (all allowed). */
  roleId?: string | null;
  /** Fleet roles see only their asset group. */
  assetGroup?: string | null;
}

interface Line {
  name: string;
  isCommand: boolean;
  works: boolean;
  why: string;
  addon: string | null;
}

export function DevicesFeaturesScreen({
  companyId,
  product,
  roleId,
  assetGroup,
}: DevicesFeaturesProps) {
  const { rules, loading, error } = useCoreRules();
  const toast = useToast();
  if (error) return <Note tone="red">{error.message}</Note>;
  if (loading || !rules) return <Loading>Reading features and hardware from Neon…</Loading>;

  const d = rules.data;
  const types = rules.productAssetTypes(product);
  const owned = rules.companyProducts(companyId);
  const assets = d.assets.filter(
    (a) =>
      a.company_id === companyId &&
      types.has(a.asset_type_id ?? '') &&
      (!assetGroup || a.asset_group === assetGroup),
  );
  const feats = new Map<string, { featureId: string; prod: string }>();
  rules.productFamily(product).forEach((p) =>
    rules.featuresOf(p).forEach((f) => {
      if (!feats.has(f.featureId)) feats.set(f.featureId, { featureId: f.featureId, prod: p });
    }),
  );
  const typeName = (id: string | null | undefined) =>
    d.asset_types.find((t) => t.id === id)?.name ?? '';
  const modelName = (id: string | null | undefined) => {
    const m = d.device_models.find((x) => x.id === id);
    return m ? `${m.maker ?? ''} ${m.model ?? ''}`.trim() : '';
  };
  const nodeName = (id: string) => rules.node(id)?.name ?? id;

  if (!assets.length)
    return (
      <Card>
        <EmptyState title="No assets yet">
          No {[...types].map(typeName).join(' / ').toLowerCase() || 'assets'} yet. Your dealer adds
          them when devices are installed.
        </EmptyState>
      </Card>
    );

  return (
    <>
      <div className="ak-grid ak-grid--wide">
        {assets.map((a) => {
          const hw = rules.installedOn(a.id);
          const lines: Line[] = [];
          for (const x of feats.values()) {
            const t = rules.typesFor(x.prod);
            if (t.size && !t.has(a.asset_type_id ?? '')) continue;
            const f = d.features.find((y) => y.id === x.featureId);
            if (!f || f.status === 'Inactive') continue;
            const acc = roleId ? rules.access(roleId, f.id) : 'Use';
            if (acc === 'Hidden') continue;
            const paid = owned.has(x.prod);
            const miss = rules.missingDataPoints(f.id, (dp) => hw.dataPoints.has(dp));
            const cmd = f.is_command === true;
            const why = !paid
              ? ''
              : miss.length
                ? 'Needs: ' + rules.missingText(miss).join(', ')
                : cmd && acc !== 'Use'
                  ? 'View only for your role'
                  : '';
            lines.push({
              name: f.name ?? f.id,
              isCommand: cmd,
              works: paid && !miss.length && (!cmd || acc === 'Use'),
              why,
              addon: paid ? null : nodeName(x.prod),
            });
          }
          const addons = [...new Set(lines.filter((l) => l.addon).map((l) => l.addon!))];
          const shown = lines
            .filter((l) => !l.addon)
            .sort((x, y) => Number(y.works) - Number(x.works) || x.name.localeCompare(y.name));
          return (
            <Card
              key={a.id}
              title={a.name}
              data-asset={a.id}
              actions={
                hw.unit ? <Chip tone="green">Online (demo)</Chip> : <Chip>Not installed</Chip>
              }
            >
              <span className="ui-muted" style={{ marginTop: -6 }}>
                {typeName(a.asset_type_id)}
                {a.plate_serial ? ` · ${a.plate_serial}` : ''} ·{' '}
                {hw.unit ? modelName(hw.unit.device_model_id) : 'no device fitted'}
                {hw.noGateways ? ' · zone location needs site gateways' : ''}
              </span>
              <div>
                {shown.map((l) => (
                  <div key={l.name} className="ak-featline">
                    <span className={l.works ? undefined : 'ui-muted'}>
                      {l.name}
                      {l.why && <small>{l.why}</small>}
                    </span>
                    {l.works ? (
                      l.isCommand ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => toast(`${l.name} sent to ${a.name} (demo)`)}
                        >
                          Send
                        </Button>
                      ) : (
                        <span className="ui-yes">✓</span>
                      )
                    ) : (
                      <span className="ui-muted">—</span>
                    )}
                  </div>
                ))}
                {!shown.length && <span className="ui-muted">No features yet.</span>}
              </div>
              {addons.length > 0 && (
                <SmallText>
                  {rules.isPackage(product) ? 'Also in this package' : 'More with add-ons'}:{' '}
                  {addons.join(', ')}. Ask your dealer.
                </SmallText>
              )}
            </Card>
          );
        })}
      </div>
      <Note tone="grey">
        A feature works when it is paid, possible with the fitted hardware, and allowed for your
        role. Online status is demo.
      </Note>
    </>
  );
}
