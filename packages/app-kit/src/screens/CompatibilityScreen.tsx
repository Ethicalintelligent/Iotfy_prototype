// Compatibility: pick products; follows Product → Feature → Data point → Sensor → Interface →
// Device and shows which hardware works. Port of legacy pCompat (legacy/src/app.js ~1466).
import { useState } from 'react';
import {
  Card,
  CheckboxField,
  Chip,
  EmptyState,
  Loading,
  Note,
  SelectField,
  Stack,
  Table,
  YesNo,
  Subhead,
} from '@iotify/ui';
import { useInterfaces, useSensorModels } from '@iotify/data';
import { useCoreRules } from '../rules-data';

export function CompatibilityScreen({
  products: offered,
}: {
  /** Products to offer (a dealer's); all when omitted. */ products?: Set<string> | null;
}) {
  const { rules } = useCoreRules();
  const sensorModels = useSensorModels();
  const interfaces = useInterfaces();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [assetType, setAssetType] = useState('');
  if (!rules || !sensorModels.data || !interfaces.data)
    return <Loading>Loading the catalogue…</Loading>;

  const d = rules.data;
  const products = rules
    .products()
    .filter((p) => p.status === 'Active' && (!offered || offered.has(p.id)));
  const sel = [...picked];
  const all = rules.withNeeds(sel);
  const feats = rules.featuresOfSet(all);
  const dps = new Map<string, string[]>();
  feats.forEach((f) =>
    rules.dataPointsOf(f.featureId).forEach((x) => {
      const dp = x.data_point_id ?? '';
      dps.set(dp, [...(dps.get(dp) ?? []), f.featureId]);
    }),
  );
  const sensors = new Map<string, string>();
  [...dps.keys()].forEach((dp) =>
    d.sensor_data_points
      .filter((r) => r.data_point_id === dp)
      .forEach((r) => sensors.set(r.sensor_model_id ?? '', dp)),
  );
  const ifaceIds = new Set<string>();
  [...sensors.keys()].forEach((s) =>
    d.sensor_interfaces
      .filter((i) => i.sensor_model_id === s)
      .forEach((i) => ifaceIds.add(i.interface_id ?? '')),
  );
  const models = d.device_models.filter((m) => m.status !== 'Inactive');
  const mName = (m: { maker?: string | null; model?: string | null; id: string }) =>
    `${m.maker ?? ''} ${m.model ?? ''}`.trim() || m.id;
  const sName = (id: string) => {
    const m = sensorModels.data!.find((x) => x.id === id);
    return m ? mName(m) : id;
  };
  const iName = (id: string) => interfaces.data!.find((x) => x.id === id)?.name ?? id;
  const certs = rules.requiredCertifications(all);
  const fits = models.filter(
    (m) => rules.evalModel(m.id, feats).all && !rules.missingCertifications(m.id, all).length,
  );
  const notForType = assetType
    ? sel.filter(
        (p) =>
          !d.product_asset_types.some((r) => r.product_id === p && r.asset_type_id === assetType),
      )
    : [];

  const Col = ({
    n,
    title,
    sub,
    items,
  }: {
    n: number;
    title: string;
    sub: string;
    items: [string, string][];
  }) => (
    <Card title={`${n}. ${title}`}>
      <span className="ui-muted">{sub}</span>
      {items.length ? (
        items.map(([a, b]) => (
          <div key={a + b}>
            <Subhead>{a}</Subhead>
            <br />
            <small className="ui-muted">{b}</small>
          </div>
        ))
      ) : (
        <span className="ui-muted">—</span>
      )}
    </Card>
  );

  return (
    <div className="ak-treewrap">
      <Card title="Products">
        <div style={{ maxHeight: '50vh', overflow: 'auto' }}>
          {products.map((p) => (
            <CheckboxField
              key={p.id}
              label={p.name ?? p.id}
              checked={picked.has(p.id)}
              onChange={(on) =>
                setPicked((s) => {
                  const x = new Set(s);
                  if (on) x.add(p.id);
                  else x.delete(p.id);
                  return x;
                })
              }
            />
          ))}
        </div>
        <SelectField
          label="Asset type"
          value={assetType}
          onChange={setAssetType}
          options={[
            { value: '', label: 'Any' },
            ...d.asset_types.map((a) => ({ value: a.id, label: a.name ?? a.id })),
          ]}
        />
      </Card>
      <div>
        {!sel.length ? (
          <Card>
            <EmptyState title="Pick products">Tick one or more products on the left.</EmptyState>
          </Card>
        ) : (
          <>
            {all.size > sel.length && (
              <Note tone="grey">
                Also counted (needed or included):{' '}
                {[...all]
                  .filter((x) => !picked.has(x))
                  .map((x) => rules.node(x)?.name)
                  .join(', ')}
              </Note>
            )}
            {notForType.length > 0 && (
              <Note>
                Not set up for this asset type:{' '}
                {notForType.map((p) => rules.node(p)?.name).join(', ')}.
              </Note>
            )}
            <div className="ak-grid">
              <Col
                n={1}
                title="Features"
                sub="From the products"
                items={feats.map((f) => [
                  d.features.find((x) => x.id === f.featureId)?.name ?? f.featureId,
                  f.availability ?? '',
                ])}
              />
              <Col
                n={2}
                title="Data points"
                sub="What the features need"
                items={[...dps.keys()].map((dp) => [
                  rules.dataPointName(dp),
                  `${d.data_points.find((x) => x.id === dp)?.unit ?? ''} · ${d.data_points.find((x) => x.id === dp)?.direction ?? ''}`,
                ])}
              />
              <Col
                n={3}
                title="Sensors"
                sub="Who gives them"
                items={[...sensors.keys()].map((s) => [
                  sName(s),
                  d.sensor_interfaces
                    .filter((i) => i.sensor_model_id === s)
                    .map((i) => iName(i.interface_id ?? ''))
                    .join(' · '),
                ])}
              />
              <Col
                n={4}
                title="Interfaces"
                sub="How they plug in"
                items={[...ifaceIds].map((i) => [
                  iName(i),
                  interfaces.data!.find((x) => x.id === i)?.medium ?? '',
                ])}
              />
              <Col
                n={5}
                title="Devices"
                sub="That fit everything"
                items={fits.map((m) => [mName(m), m.type ?? ''])}
              />
            </div>
            {certs.length > 0 && (
              <Note>
                Certified hardware required: {certs.join(', ')}. Uncertified models are ruled out
                even if their interfaces fit.
              </Note>
            )}
            <Card title="Result by device model">
              <Table
                bare
                label="Result by device model"
                rows={models}
                columns={[
                  { header: 'Device model', cell: (m) => <b>{mName(m)}</b> },
                  {
                    header: 'Result',
                    cell: (m) => <YesNo value={fits.includes(m)} yes="Fits" no="Does not fit" />,
                  },
                  {
                    header: 'How each data point is delivered',
                    cell: (m) => (
                      <Stack gap={4}>
                        {rules.missingCertifications(m.id, all).length > 0 && (
                          <Chip tone="red">
                            Not certified: {rules.missingCertifications(m.id, all).join(', ')}
                          </Chip>
                        )}
                        {[...dps.keys()].map((dp) => {
                          const s = rules.dataPointOnModel(m.id, dp);
                          return (
                            <Chip key={dp} tone={s.ok ? 'neutral' : 'red'}>
                              {rules.dataPointName(dp)}:{' '}
                              {s.ok
                                ? s.how === 'sensor'
                                  ? `sensor ${sName(s.options[0]!.sensorModelId)}`
                                  : s.how === 'infrastructure'
                                    ? 'site infrastructure'
                                    : 'built-in'
                                : 'not possible'}
                            </Chip>
                          );
                        })}
                      </Stack>
                    ),
                  },
                ]}
              />
            </Card>
            <Note tone="grey">
              <b>Paid?</b> the subscription includes the product. <b>Possible?</b> device and
              sensors give the data points (this screen). <b>Allowed?</b> the user's role has the
              permission.
            </Note>
          </>
        )}
      </div>
    </div>
  );
}
