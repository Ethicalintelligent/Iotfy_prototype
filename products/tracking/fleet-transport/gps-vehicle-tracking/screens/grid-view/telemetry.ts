// Demo device and sensor readings for the Grid View cards (GPS, GSM, batteries, temperature,
// load, back door), generated from each real vehicle with fixed seeds so every reload agrees.
// Which sensors a vehicle has is demo too: the database has no sensor set-up yet. AC, seat belt,
// front door and engine come from the shared demo fleet (every tracker reports them). Labelled
// as demo on screen; real device data replaces it when trackers report. Invented values only.
import { dayKey, hash, rng, type LiveVehicle } from '../../demo/fleet';

export type BatteryLevel = 'Very High' | 'High' | 'Medium' | 'Low';
export const BATTERY_LEVELS: BatteryLevel[] = ['Very High', 'High', 'Medium', 'Low'];
export type SensorKind = 'temperature' | 'load' | 'door' | 'ac';

export interface Temperature {
  /** "Temp 1" (wired) or "BT 1" (Bluetooth). */
  name: string;
  bluetooth: boolean;
  /** °C; null before the first report. */
  value: number | null;
  min: number;
  max: number;
}

export interface Load {
  /** kg; null before the first report. */
  kg: number | null;
  max: number;
}

export interface Telemetry {
  /** Sensors fitted to the vehicle (AC is a standard tracker input). */
  installed: Record<SensorKind, boolean>;
  gps: { available: boolean; satellites: number } | null;
  /** Signal bars, 0–5. */
  gsm: number | null;
  internalBattery: BatteryLevel | null;
  externalBattery: { connected: boolean; volts: number } | null;
  temperature: Temperature | null;
  load: Load | null;
  /** Back (cargo) door open; null when not fitted or no data. */
  backDoor: boolean | null;
  /** A sensor reads outside its set limits. */
  outOfRange: boolean;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/** A vehicle's device and sensor readings now (demo). Readings change every 10 minutes. */
export function telemetry(v: LiveVehicle, now: Date): Telemetry {
  const fit = (kind: string, share: number) => (hash(v.id + kind) % 100) / 100 < share;
  const installed: Record<SensorKind, boolean> = {
    temperature: fit('temp-sensor', 0.45),
    load: fit('load-sensor', 0.35),
    door: fit('door-sensor', 0.4),
    ac: true,
  };
  const r = rng(v.id + 'tel' + dayKey(now) + Math.floor(now.getTime() / 600_000));
  const neverReported = v.status === 'ytt';
  const engineOn = v.ignition === true;

  const bluetooth = hash(v.id + 'bt') % 2 === 0;
  const tMin = bluetooth ? -25 : -10;
  const tMax = bluetooth ? -15 : 8;
  let tValue: number | null = null;
  if (!neverReported) {
    const outside = r() < 0.25;
    tValue = outside
      ? r() < 0.5
        ? round1(tMin - 1 - r() * 4)
        : round1(tMax + 1 + r() * 4)
      : round1(tMin + 1 + r() * (tMax - tMin - 2));
  }
  const temperature: Temperature | null = installed.temperature
    ? { name: bluetooth ? 'BT 1' : 'Temp 1', bluetooth, value: tValue, min: tMin, max: tMax }
    : null;

  const loadMax = 5000;
  const load: Load | null = installed.load
    ? {
        kg: neverReported
          ? null
          : Math.round(r() < 0.15 ? loadMax + 100 + r() * 800 : r() * loadMax),
        max: loadMax,
      }
    : null;

  const tempOut =
    temperature?.value != null &&
    (temperature.value < temperature.min || temperature.value > temperature.max);
  const loadOut = load?.kg != null && load.kg > load.max;

  return {
    installed,
    gps: neverReported ? null : { available: r() > 0.08, satellites: 4 + Math.floor(r() * 10) },
    gsm: neverReported ? null : Math.floor(r() * 6),
    internalBattery: neverReported
      ? null
      : BATTERY_LEVELS[Math.floor(r() * BATTERY_LEVELS.length)]!,
    externalBattery: neverReported
      ? null
      : { connected: r() > 0.1, volts: Math.round((12.1 + r() * 1.7) * 100) / 100 },
    temperature,
    load,
    backDoor: installed.door && !neverReported ? !engineOn && r() > 0.6 : null,
    outOfRange: tempOut || loadOut,
  };
}

export type SignalBand = 'strong' | 'weak' | 'none';
/** 0 bars: no signal; 1–2: weak; 3–5: strong. */
export const signalBand = (bars: number): SignalBand =>
  bars === 0 ? 'none' : bars < 3 ? 'weak' : 'strong';
