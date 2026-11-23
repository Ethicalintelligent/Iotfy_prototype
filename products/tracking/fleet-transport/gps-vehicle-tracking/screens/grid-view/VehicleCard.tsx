// A vehicle's card in the Grid View (approved design, Desktop/vs/Grid-View.html): picture, call
// sign, plate, status, sensor and device indicators, operator, speed, location, odometer, last
// report and actions; its back side lists sensors and device details. Built from @iotify/ui.
import type { ReactNode } from 'react';
import {
  ActionIcon,
  AssetCard,
  AutoGrid,
  FactGrid,
  HueChip,
  Indicator,
  IndicatorStrip,
  InfoRows,
  ReadingTile,
  Stack,
  type Fact,
  type Hue,
  type IconName,
  type InfoRow,
} from '@iotify/ui';
import { VehiclePhoto } from '@iotify/illustrations';
import type { LiveVehicle } from '../../demo/fleet';
import { STATUS } from '../../shared/vehicle-status';
import { ago, dateTimeText, km, num } from '../../shared/format';
import { signalBand, type Telemetry } from './telemetry';

export interface Ind {
  key: string;
  icon: IconName;
  label: string;
  hue: Hue;
  state: 'on' | 'off' | 'none';
}

const none = (key: string, icon: IconName, name: string, why = 'No data'): Ind => ({
  key,
  icon,
  label: `${name}: ${why}`,
  hue: 'grey',
  state: 'none',
});

/** The indicator icons of a vehicle, in the design's order. */
export function indicators(v: LiveVehicle, t: Telemetry): Ind[] {
  const out: Ind[] = [];
  out.push(
    !t.gps
      ? none('gps', 'target', 'GPS')
      : t.gps.available
        ? {
            key: 'gps',
            icon: 'target',
            label: `GPS: Available · ${t.gps.satellites} satellites`,
            hue: 'green',
            state: 'on',
          }
        : { key: 'gps', icon: 'target', label: 'GPS: Not available', hue: 'red', state: 'off' },
  );
  if (t.gsm == null) out.push(none('gsm', 'signal', 'GSM'));
  else {
    const band = signalBand(t.gsm);
    out.push({
      key: 'gsm',
      icon: 'signal',
      label: `GSM: ${band === 'strong' ? 'Strong signal' : band === 'weak' ? 'Weak signal' : 'No signal'} (${t.gsm}/5)`,
      hue: band === 'strong' ? 'green' : band === 'weak' ? 'orange' : 'red',
      state: band === 'none' ? 'off' : 'on',
    });
  }
  out.push(
    !t.internalBattery
      ? none('ib', 'zap', 'Internal Battery')
      : {
          key: 'ib',
          icon: 'zap',
          label: `Internal Battery: ${t.internalBattery}`,
          hue:
            t.internalBattery === 'Low'
              ? 'red'
              : t.internalBattery === 'Medium'
                ? 'orange'
                : 'green',
          state: t.internalBattery === 'Low' ? 'off' : 'on',
        },
  );
  out.push(
    !t.externalBattery
      ? none('eb', 'power', 'External Battery')
      : t.externalBattery.connected
        ? {
            key: 'eb',
            icon: 'power',
            label: `External Battery: Connected · ${t.externalBattery.volts} V`,
            hue: 'green',
            state: 'on',
          }
        : {
            key: 'eb',
            icon: 'power',
            label: 'External Battery: Disconnected',
            hue: 'red',
            state: 'off',
          },
  );
  out.push(
    v.ac == null
      ? none('ac', 'snow', 'AC')
      : v.ac
        ? { key: 'ac', icon: 'snow', label: 'AC: On', hue: 'blue', state: 'on' }
        : { key: 'ac', icon: 'snow', label: 'AC: Off', hue: 'grey', state: 'off' },
  );
  out.push(
    v.belt == null
      ? none('belt', 'seat', 'Seatbelt')
      : v.belt
        ? { key: 'belt', icon: 'seat', label: 'Seatbelt: Fastened', hue: 'green', state: 'on' }
        : {
            key: 'belt',
            icon: 'seat',
            label: 'Seatbelt: Unfastened',
            hue: v.ignition ? 'red' : 'grey',
            state: 'off',
          },
  );
  out.push(
    v.door == null
      ? none('fd', 'door', 'Front Door')
      : v.door
        ? { key: 'fd', icon: 'door', label: 'Front Door: Open', hue: 'orange', state: 'on' }
        : { key: 'fd', icon: 'door', label: 'Front Door: Closed', hue: 'grey', state: 'off' },
  );
  out.push(
    !t.installed.door
      ? none('bd', 'door', 'Back Door', 'Not configured')
      : t.backDoor == null
        ? none('bd', 'door', 'Back Door')
        : t.backDoor
          ? { key: 'bd', icon: 'door', label: 'Back Door: Open', hue: 'orange', state: 'on' }
          : { key: 'bd', icon: 'door', label: 'Back Door: Closed', hue: 'grey', state: 'off' },
  );
  out.push(
    v.ignition == null
      ? none('eng', 'key', 'Engine')
      : v.ignition
        ? { key: 'eng', icon: 'key', label: 'Engine: On', hue: 'green', state: 'on' }
        : { key: 'eng', icon: 'key', label: 'Engine: Off', hue: 'red', state: 'off' },
  );
  return out;
}

/** The indicator row (also used in the list view). */
export function Indicators({
  v,
  t,
  bare,
  end,
}: {
  v: LiveVehicle;
  t: Telemetry;
  bare?: boolean;
  end?: ReactNode;
}) {
  return (
    <IndicatorStrip label={`${v.callSign} sensors and device`} bare={bare} end={end}>
      {indicators(v, t).map((i) => (
        <Indicator key={i.key} icon={i.icon} label={i.label} hue={i.hue} state={i.state} />
      ))}
    </IndicatorStrip>
  );
}

const reporting = (v: LiveVehicle) => v.status !== 'ytt';
/** Speed in the status colour (grey when not reporting). */
export const speedHue = (v: LiveVehicle): Hue | undefined =>
  v.status === 'notx' || v.status === 'ytt' ? undefined : STATUS[v.status].hue;

/** Sensors, connectivity, power and inputs: the back of the card. */
function DeviceDetails({ v, t }: { v: LiveVehicle; t: Telemetry }) {
  const tiles = [];
  if (t.temperature) {
    const x = t.temperature;
    const out = x.value != null && (x.value < x.min || x.value > x.max);
    tiles.push(
      <ReadingTile
        key="temp"
        icon="thermo"
        hue={out ? 'red' : 'green'}
        label={x.bluetooth ? 'Bluetooth temp.' : 'Temperature'}
        value={x.value == null ? 'No reading yet' : `${x.value} °C`}
        sub={x.name}
        percent={x.value == null ? 0 : ((x.value - x.min) / (x.max - x.min)) * 100}
        range={`${x.min} – ${x.max} °C`}
      />,
    );
  }
  if (t.load) {
    const x = t.load;
    const out = x.kg != null && x.kg > x.max;
    tiles.push(
      <ReadingTile
        key="load"
        icon="chart"
        hue={out ? 'red' : 'purple'}
        label="Load sensor"
        value={x.kg == null ? 'No reading yet' : `${num(x.kg)} kg`}
        sub="Analog Input 2"
        percent={x.kg == null ? 0 : (x.kg / x.max) * 100}
        range={`0 – ${num(x.max)} kg`}
      />,
    );
  }
  const ind = new Map(indicators(v, t).map((i) => [i.key, i]));
  const row = (key: string, name: string, detail?: string): InfoRow => {
    const i = ind.get(key)!;
    return {
      key,
      label: name,
      icon: i.icon,
      value: i.label.slice(i.label.indexOf(':') + 2).split(' · ')[0],
      detail,
      hue: i.state === 'none' ? undefined : i.hue === 'grey' ? 'slate' : i.hue,
    };
  };
  return (
    <>
      <InfoRows
        heading="Sensors"
        icon="thermo"
        count={tiles.length}
        empty="No sensors configured for this vehicle"
      >
        {tiles.length > 0 && <AutoGrid min={130}>{tiles}</AutoGrid>}
      </InfoRows>
      <InfoRows
        heading="Connectivity"
        icon="signal"
        rows={[
          row('gps', 'GPS', t.gps?.available ? `${t.gps.satellites} satellites` : undefined),
          row('gsm', 'GSM'),
        ]}
      />
      <InfoRows
        heading="Power"
        icon="power"
        rows={[
          row('ib', 'Internal Battery'),
          row(
            'eb',
            'External Battery',
            t.externalBattery ? `${t.externalBattery.volts} V` : undefined,
          ),
        ]}
      />
      <InfoRows
        heading="Inputs"
        icon="key"
        rows={[
          row('eng', 'Engine'),
          row('ac', 'AC'),
          row('belt', 'Seatbelt'),
          row('fd', 'Front Door'),
          row('bd', 'Back Door'),
        ]}
      />
    </>
  );
}

export interface CardActions {
  /** Opens a screen of this product (Tracking, Map View, Alerts, Reports, Manage). */
  go?: (screen: string) => void;
  readOnly: boolean;
}

/** The action icons under a card or at the end of a list row. */
export function VehicleActions({ v, go, readOnly }: { v: LiveVehicle } & CardActions) {
  const open = (screen: string) => (go ? () => go(screen) : undefined);
  return (
    <Stack gap={6} wrap={false}>
      <ActionIcon
        icon="eye"
        hue="slate"
        label={`Vehicle details: ${v.callSign} (Tracking)`}
        onClick={open('tracking')}
      />
      <ActionIcon
        icon="map"
        hue="blue"
        label={`Live monitor: ${v.callSign} (Map View)`}
        onClick={open('map')}
      />
      <ActionIcon
        icon="bell"
        hue="orange"
        label={`Alerts: ${v.callSign}`}
        onClick={open('alerts')}
      />
      <ActionIcon
        icon="sheet"
        hue="green"
        label={`Vehicle report: ${v.callSign}`}
        onClick={open('reports')}
      />
      <ActionIcon
        icon="lock"
        hue="red"
        label={`Immobilizer: ${v.callSign} (needs a live tracker; not in this demo)`}
        disabled
      />
      {!readOnly && (
        <ActionIcon
          icon="sliders"
          hue="green"
          label={`Settings: ${v.callSign} (Manage)`}
          onClick={open('manage')}
        />
      )}
    </Stack>
  );
}

export function VehicleCard({
  v,
  t,
  now,
  flipped,
  onFlip,
  go,
  readOnly,
}: {
  v: LiveVehicle;
  t: Telemetry;
  now: Date;
  flipped: boolean;
  onFlip: (on: boolean) => void;
  go?: (screen: string) => void;
  readOnly: boolean;
}) {
  const s = STATUS[v.status];
  const facts: Fact[] = [
    { key: 'op', label: 'Operator', icon: 'user', value: v.operator ?? 'Not Assigned' },
    {
      key: 'speed',
      label: 'Speed',
      icon: 'gauge',
      value: reporting(v) ? `${v.speed} km/h` : '—',
      hue: speedHue(v),
    },
    {
      key: 'loc',
      label: 'Location',
      icon: 'geofence',
      value: reporting(v) ? v.area : '—',
      title: reporting(v) ? v.area : undefined,
    },
    { key: 'odo', label: 'Odometer', icon: 'route', value: km(v.odometer) },
  ];
  return (
    <AssetCard
      hue={s.hue}
      lead={<VehiclePhoto category={v.category} size={44} />}
      title={v.callSign}
      subtitle={v.plate}
      badge={
        <HueChip hue={s.hue} solid>
          {s.label}
        </HueChip>
      }
      note={v.lastReport ? dateTimeText(v.lastReport) : '—'}
      footer={<VehicleActions v={v} go={go} readOnly={readOnly} />}
      back={
        flipped
          ? {
              title: 'Sensors & Device',
              subtitle: v.lastReport
                ? `Last report ${ago(v.lastReport, now).toLowerCase()} (demo)`
                : 'No report yet',
              icon: 'pulse',
              onClose: () => onFlip(false),
              children: <DeviceDetails v={v} t={t} />,
            }
          : null
      }
    >
      <Indicators
        v={v}
        t={t}
        end={
          <ActionIcon
            icon="chip"
            hue="green"
            label={`More details: ${v.callSign} sensors and device`}
            onClick={() => onFlip(true)}
          />
        }
      />
      <FactGrid items={facts} />
    </AssetCard>
  );
}
