// Grid View: what a vehicle's card and list row show (colours, indicators, chips), from the
// design's cardData() rules.
import type { IndicatorIcon } from './icons';
import {
  acColor,
  batteryColor,
  beltColor,
  doorColor,
  engineColor,
  extColor,
  gpsColor,
  gsmColor,
  GREEN,
  NEUTRAL,
  num,
  ORANGE,
  outOfRange,
  RED,
  STATUS_LOOK,
  STATUS_PILL,
  type GridVehicle,
} from './model';

export interface IndicatorLook {
  key: string;
  title: string;
  color: string;
  icon: IndicatorIcon;
  badge?: string;
}
export interface SensorLook {
  name: string;
  source: string;
  value: string;
  range: string;
  bg: string;
  line: string;
  fg: string;
}
export interface DeviceLook {
  label: string;
  value: string;
  color: string;
  icon: IndicatorIcon;
}
export interface InputChip {
  label: string;
  value: string;
  short: string;
  shortValue: string;
  dot: string;
  bg: string;
  fg: string;
}
export interface SensorChip {
  text: string;
  bg: string;
  fg: string;
}
export interface CardLook {
  vehicle: GridVehicle;
  grad: string;
  speedFg: string;
  opFg: string;
  vsFg: string;
  dateShort: string;
  timeShort: string;
  pillSpace: string;
  pillColor: string;
  pillSoft: string;
  maintenance: boolean;
  indicators: IndicatorLook[];
  sensors: SensorLook[];
  device: DeviceLook[];
  inputs: InputChip[];
  sensorChips: SensorChip[];
}

const SHORT_LABEL: Record<string, string> = {
  Ignition: 'Engine',
  'Seat belt': 'Belt',
  'Front door': 'Front',
  'Back door': 'Back',
};

function chip(label: string, value: string, color: string): InputChip {
  const [bg, fg] =
    color === GREEN
      ? ['#E6F5EF', '#0A6B4B']
      : color === ORANGE
        ? ['#FFF1E6', '#B4530A']
        : color === RED
          ? ['#FDECEC', '#C70406']
          : ['#F1F3F5', '#6B7685'];
  return {
    label,
    value,
    short: SHORT_LABEL[label] ?? label,
    shortValue: value === 'Not configured' ? 'N/C' : value === 'No data' ? 'N/A' : value,
    dot: color,
    bg,
    fg,
  };
}

type IndicatorFields =
  | 'gps'
  | 'gpsSat'
  | 'intBat'
  | 'extBat'
  | 'extV'
  | 'gsm'
  | 'engine'
  | 'ac'
  | 'seatbelt'
  | 'frontDoor'
  | 'backDoor'
  | 'alerts';

/**
 * The card's indicator icons (GPS, battery, power, GSM, ignition, AC, seat belt, doors, alerts) for
 * a vehicle's demo record. Map View's vehicle list and marker tooltips use the same ones (IT-0044).
 */
export function indicatorsOf(v: Pick<GridVehicle, IndicatorFields>): IndicatorLook[] {
  const gps = v.gps + (v.gpsSat ? ` · ${v.gpsSat}` : '');
  const ext = v.extBat + (v.extV ? ` · ${v.extV}` : '');
  return [
    { key: 'gps', title: `GPS: ${gps}`, color: gpsColor(v.gps), icon: { line: 'gps' } },
    {
      key: 'battery',
      title: `Internal battery: ${v.intBat}`,
      color: batteryColor(v.intBat),
      icon: { filled: 'battery' },
    },
    {
      key: 'power',
      title: `External power: ${ext}`,
      color: extColor(v.extBat),
      icon: { filled: 'power' },
    },
    { key: 'gsm', title: `GSM: ${v.gsm}`, color: gsmColor(v.gsm), icon: { filled: 'gsm' } },
    {
      key: 'key',
      title: `Ignition: ${v.engine}`,
      color: engineColor(v.engine),
      icon: { line: 'key' },
    },
    { key: 'ac', title: `AC: ${v.ac}`, color: acColor(v.ac), icon: { line: 'ac' } },
    {
      key: 'belt',
      title: `Seat belt: ${v.seatbelt}`,
      color: beltColor(v.seatbelt),
      icon: { line: 'belt' },
    },
    {
      key: 'front',
      title: `Front door: ${v.frontDoor}`,
      color: doorColor(v.frontDoor),
      icon: { filled: 'front' },
    },
    {
      key: 'back',
      title: `Back door: ${v.backDoor}`,
      color: doorColor(v.backDoor),
      icon: { filled: 'back' },
    },
    {
      key: 'alert',
      title: v.alerts ? `${v.alerts} active alert${v.alerts > 1 ? 's' : ''}` : 'No active alerts',
      color: v.alerts ? ORANGE : NEUTRAL,
      icon: { line: 'alert' },
      badge: v.alerts ? String(v.alerts) : undefined,
    },
  ];
}

export function cardLook(v: GridVehicle): CardLook {
  const look = STATUS_LOOK[v.status] ?? STATUS_LOOK['Yet to Transmit'];
  const [pillColor, pillSoft] = STATUS_PILL[v.status] ?? STATUS_PILL['Yet to Transmit'];
  const gps = v.gps + (v.gpsSat ? ` · ${v.gpsSat}` : '');
  const ext = v.extBat + (v.extV ? ` · ${v.extV}` : '');
  const indicators = indicatorsOf(v);
  return {
    vehicle: v,
    grad: look.grad,
    speedFg: (num(v.speed) ?? 0) > 0 ? '#009863' : '#3D4A5C',
    opFg: v.operator === 'Not Assigned' ? '#748093' : '#4B5563',
    vsFg: v.vstatus === 'Maintenance' ? '#B4530A' : '#0E7F5E',
    dateShort: (/^([A-Za-z]{3} \d{1,2})/.exec(v.updated) ?? ['', 'No update'])[1],
    timeShort: (/(\d{1,2}:\d{2} [AP]M)$/.exec(v.updated) ?? ['', ''])[1],
    pillSpace: `${(v.status.length * 6 + 30).toFixed(0)}px`,
    pillColor,
    pillSoft,
    maintenance: v.vstatus === 'Maintenance',
    indicators,
    sensors: v.sensors.map((s) => {
      const bad = outOfRange(s);
      return {
        name: s.name,
        source: s.source,
        value: s.value,
        range: `Range ${s.range ?? ''}`,
        bg: bad ? '#FFF4F4' : '#F6FBF8',
        line: bad ? '#FBD0D0' : '#D5EEE2',
        fg: bad ? '#C70406' : '#0B1B2B',
      };
    }),
    device: [
      { label: 'GPS', value: gps, color: gpsColor(v.gps), icon: { line: 'gps' } },
      { label: 'GSM', value: v.gsm, color: gsmColor(v.gsm), icon: { filled: 'gsm' } },
      {
        label: 'Internal battery',
        value: v.intBat,
        color: batteryColor(v.intBat),
        icon: { filled: 'battery' },
      },
      { label: 'External power', value: ext, color: extColor(v.extBat), icon: { filled: 'power' } },
    ],
    inputs: [
      chip('Ignition', v.engine, engineColor(v.engine)),
      chip('AC', v.ac, acColor(v.ac)),
      chip('Seat belt', v.seatbelt, beltColor(v.seatbelt)),
      chip('Front door', v.frontDoor, doorColor(v.frontDoor)),
      chip('Back door', v.backDoor, doorColor(v.backDoor)),
    ],
    sensorChips: v.sensors.map((s) => {
      const bad = outOfRange(s);
      return {
        text: `${s.name} ${s.value}`,
        bg: bad ? '#FDECEC' : '#E6F5EF',
        fg: bad ? '#C70406' : '#0A6B4B',
      };
    }),
  };
}
