// The panel at the bottom of the Tracking map (approved design, Desktop/vs/Tracking.html): date and
// time, operator, position, speed gauge, odometer, the vehicle's sensors and time per status.
// Live: the vehicle now. Track History: the vehicle at the playback position.
import { useState } from 'react';
import { Card, Gauge, HueChip, Icon, IconButton, IconTile, Stack, type Hue } from '@iotify/ui';
import type { IconName } from '@iotify/ui';
import { dateText, hm, km } from '../../shared/format';
import { clockText, coordText, type StatusHours } from './track';

/** A sensor: on (coloured), off (grey) or unknown (grey, "—"). */
export interface Sensor {
  key: string;
  label: string;
  icon: IconName;
  on: boolean | null;
  /** Colour when on (default green). */
  hue?: Hue;
  /** Words for on / off (default On / Off). */
  words?: [string, string];
}

export interface InfoPanelProps {
  at: Date;
  operator: string | null;
  operatorId: string | null;
  lat: number;
  lng: number;
  speed: number;
  speedLimit: number;
  odometer: number | null;
  sensors: Sensor[];
  hours: StatusHours;
}

function SensorIcon({ s }: { s: Sensor }) {
  const state = s.on == null ? '—' : s.on ? (s.words?.[0] ?? 'On') : (s.words?.[1] ?? 'Off');
  const text = `${s.label}: ${state}`;
  return (
    <span role="img" aria-label={text} title={text}>
      <IconTile icon={s.icon} hue={s.on ? (s.hue ?? 'green') : 'grey'} size="sm" />
    </span>
  );
}

export function InfoPanel(p: InfoPanelProps) {
  const [open, setOpen] = useState(true);
  const stamp = (
    <HueChip hue="green" solid icon="calendar">
      {dateText(p.at)} · {clockText(p.at)}
    </HueChip>
  );
  if (!open)
    return (
      <Card>
        <Stack gap={10} wrap={false}>
          {stamp}
          <b>{p.speed} km/h</b>
          <IconButton icon="plus" label="Show details" onClick={() => setOpen(true)} />
        </Stack>
      </Card>
    );
  return (
    <Card aria-label="Vehicle details">
      <Stack gap={20} align="center">
        <Stack dir="col" gap={4} align="flex-start">
          {stamp}
          <span className="ui-muted">Operator</span>
          <b>{p.operator ?? 'Not Assigned'}</b>
          <span className="ui-muted">ID: {p.operatorId ?? '—'}</span>
          <Stack gap={4} wrap={false}>
            <Icon name="geofence" size={14} />
            <b>{coordText(p.lat, p.lng)}</b>
          </Stack>
        </Stack>
        <Gauge label="Speed" value={p.speed} limit={p.speedLimit} unit="km/h" size={136} />
        <Stack dir="col" gap={10} align="flex-start">
          <Stack gap={24} align="flex-start">
            <Stack dir="col" gap={6} align="flex-start">
              <span className="ui-muted">Odometer</span>
              <b>{p.odometer == null ? '—' : km(p.odometer)}</b>
            </Stack>
            <Stack dir="col" gap={6} align="flex-start">
              <span className="ui-muted">Vehicle Sensors:</span>
              <Stack gap={4}>
                {p.sensors.map((s) => (
                  <SensorIcon key={s.key} s={s} />
                ))}
              </Stack>
            </Stack>
          </Stack>
          <Stack gap={8}>
            <HueChip hue="green" solid>
              {hm(p.hours.running)} Running
            </HueChip>
            <HueChip hue="red" solid>
              {hm(p.hours.stopped)} Stopped
            </HueChip>
            <HueChip hue="blue" solid>
              {hm(p.hours.idle)} Idle
            </HueChip>
          </Stack>
        </Stack>
        <IconButton icon="minus" label="Hide details" onClick={() => setOpen(false)} />
      </Stack>
    </Card>
  );
}
