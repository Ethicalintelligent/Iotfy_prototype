// IT-0036. The original page's tracker catalogue (its demo API `/api/v1/tracking/device-models`,
// copied from the bundle) with each model's ports. Neon's device_models has no port data, so
// these entries are the fallback for the Tracking Options pane: they add their makes / models to
// the tracker lists and, when a model lists ports, size the I/O rows and show the
// "x digital in · …" hint (original `h0`, `OD`). In the original all three models have empty
// ports, so — exactly as there — no hint appears and the rows keep their default sizes.

export type Ports = Partial<
  Record<
    'DIN' | 'DOUT' | 'AIN' | 'ONE_WIRE' | 'BLE' | 'CAN' | 'OBD2' | 'RS232' | 'RS485' | 'SERIAL',
    string[]
  >
>;
export interface CatalogueModel {
  id: number;
  manufacturer: string;
  name: string;
  protocolCode: string;
  ports: Ports;
}

export const DEVICE_CATALOGUE: CatalogueModel[] = [
  { id: 1, manufacturer: 'Teltonika', name: 'FMB920', protocolCode: 'TELTONIKA_FMB', ports: {} },
  { id: 2, manufacturer: 'Teltonika', name: 'FMB130', protocolCode: 'TELTONIKA_FMB', ports: {} },
  { id: 3, manufacturer: 'Concox', name: 'GT06N', protocolCode: 'CONCOX_GT06', ports: {} },
].sort((a, b) => a.manufacturer.localeCompare(b.manufacturer) || a.name.localeCompare(b.name));

export interface PortCounts {
  din: number;
  dout: number;
  ain: number;
  oneWire: boolean;
  ble: boolean;
  rs232: number;
  rs485: number;
}

/** A model's port counts, or undefined when it lists none (original `h0`). */
export function portsOf(make: string, model: string): PortCounts | undefined {
  const m = DEVICE_CATALOGUE.find((x) => x.name === model && (!make || x.manufacturer === make));
  if (!m || !Object.values(m.ports).some((l) => l?.length)) return undefined;
  const n = (k: keyof Ports) => m.ports[k]?.length ?? 0;
  const serial = (p: string) =>
    (m.ports.SERIAL ?? []).filter((s) => s.toUpperCase().startsWith(p)).length;
  return {
    din: n('DIN'),
    dout: n('DOUT'),
    ain: n('AIN'),
    oneWire: n('ONE_WIRE') > 0,
    ble: n('BLE') > 0,
    rs232: n('RS232') + serial('RS232'),
    rs485: n('RS485') + serial('RS485'),
  };
}

/** The ports line under Device Model (original hint text). */
export function portsHint(p?: PortCounts) {
  if (!p) return undefined;
  return [
    `${p.din} digital in`,
    `${p.dout} digital out`,
    `${p.ain} analog in`,
    ...(p.oneWire ? ['1-Wire'] : []),
    ...(p.ble ? ['Bluetooth'] : []),
    ...(p.rs232 ? [`${p.rs232} RS232`] : []),
    ...(p.rs485 ? [`${p.rs485} RS485`] : []),
  ].join(' · ');
}

/** Makes and their models: Neon's device models plus the original catalogue. */
export function trackerCatalogue(neon: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const add = (make: string, model: string) => {
    const l = (out[make] ??= []);
    if (!l.includes(model)) l.push(model);
  };
  for (const m of DEVICE_CATALOGUE) add(m.manufacturer, m.name);
  for (const [make, list] of Object.entries(neon)) list.forEach((m) => add(make, m));
  return Object.fromEntries(
    Object.keys(out)
      .sort()
      .map((k) => [k, out[k]!]),
  );
}
