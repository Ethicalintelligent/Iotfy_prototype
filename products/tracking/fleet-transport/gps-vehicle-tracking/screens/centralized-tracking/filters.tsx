// Centralized Tracking's two filters (approved design, Desktop/vs/Centralized-Tracking.html):
// "Vehicle Filters" for the live map (people, vehicle type and a tick list of vehicles by group)
// and the "History filter" (up to 6 vehicles and one day in the last 7). Built from @iotify/ui.
// People, types, groups and vehicles are real.
import { useEffect, useState } from 'react';
import {
  Button,
  CheckTree,
  DateField,
  Drawer,
  FieldGrid,
  FormSection,
  FullRow,
  Modal,
  Note,
  SelectField,
  Stack,
  type CheckTreeGroup,
} from '@iotify/ui';
import { addDays, dayKey, startOfDay, type LiveVehicle } from '../../demo/fleet';
import { MAX_REPLAY } from './replay';

export interface Option {
  value: string;
  label: string;
}

/** People and vehicle details used by the filters (from the database). */
export interface VehicleInfo {
  fleetManagerId: string | null;
  supervisorId: string | null;
  operatorId: string | null;
  vehicleType: string | null;
}

export interface LiveFilter {
  fleetManager: string;
  supervisor: string;
  operator: string;
  vehicleType: string;
  /** Ticked vehicles; null = all. */
  vehicles: string[] | null;
}
export const NO_LIVE_FILTER: LiveFilter = {
  fleetManager: '',
  supervisor: '',
  operator: '',
  vehicleType: '',
  vehicles: null,
};

export const liveFilterOn = (f: LiveFilter) =>
  !!(f.fleetManager || f.supervisor || f.operator || f.vehicleType || f.vehicles);

/** Whether a vehicle passes the live filter. */
export function passes(v: LiveVehicle, info: VehicleInfo | undefined, f: LiveFilter): boolean {
  return (
    (!f.fleetManager || info?.fleetManagerId === f.fleetManager) &&
    (!f.supervisor || info?.supervisorId === f.supervisor) &&
    (!f.operator || info?.operatorId === f.operator) &&
    (!f.vehicleType || info?.vehicleType === f.vehicleType) &&
    (!f.vehicles || f.vehicles.includes(v.id))
  );
}

/** Vehicles by group for a CheckTree (plate, with the call sign beside it). */
export function vehicleTree(vs: LiveVehicle[]): CheckTreeGroup[] {
  const groups = new Map<string, LiveVehicle[]>();
  for (const v of vs)
    groups.set(v.group ?? 'No group', [...(groups.get(v.group ?? 'No group') ?? []), v]);
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([g, list]) => ({
      key: g,
      label: g,
      items: list.map((v) => ({ key: v.id, label: v.plate, detail: v.callSign })),
    }));
}

export interface PeopleChoices {
  fleetManagers: Option[];
  supervisors: Option[];
  operators: Option[];
  vehicleTypes: Option[];
}

function Person({
  label,
  empty,
  value,
  options,
  onChange,
}: {
  label: string;
  empty: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}) {
  return (
    <SelectField
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={options.length ? `Any ${label.toLowerCase()}` : empty}
      disabled={!options.length}
    />
  );
}

/** "Vehicle Filters" for the live map: Submit applies, Reset clears. */
export function LiveFilterModal({
  open,
  onClose,
  value,
  onApply,
  vehicles,
  info,
  choices,
}: {
  open: boolean;
  onClose: () => void;
  value: LiveFilter;
  onApply: (f: LiveFilter) => void;
  vehicles: LiveVehicle[];
  info: Map<string, VehicleInfo>;
  choices: PeopleChoices;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);
  const set = <K extends keyof LiveFilter>(k: K, v: LiveFilter[K]) =>
    setDraft({ ...draft, [k]: v });
  // The tick list shows the vehicles that match the chosen people and type.
  const matching = vehicles.filter((v) => passes(v, info.get(v.id), { ...draft, vehicles: null }));
  const ids = matching.map((v) => v.id);
  const ticked = new Set(draft.vehicles ?? ids);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Vehicle Filters"
      maxWidth={820}
      footerStart={
        <Button icon="refresh" onClick={() => setDraft(NO_LIVE_FILTER)}>
          Reset
        </Button>
      }
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            Submit
          </Button>
        </>
      }
    >
      <FieldGrid>
        <Stack dir="col" gap={10} align="stretch">
          <Person
            label="Fleet Manager"
            empty="None assigned yet"
            value={draft.fleetManager}
            options={choices.fleetManagers}
            onChange={(v) => set('fleetManager', v)}
          />
          <Person
            label="Supervisor"
            empty="None assigned yet"
            value={draft.supervisor}
            options={choices.supervisors}
            onChange={(v) => set('supervisor', v)}
          />
          <Person
            label="Vehicle Operator"
            empty="None assigned yet"
            value={draft.operator}
            options={choices.operators}
            onChange={(v) => set('operator', v)}
          />
          <SelectField
            label="Vehicle Type"
            value={draft.vehicleType}
            onChange={(v) => set('vehicleType', v)}
            options={choices.vehicleTypes}
            placeholder="Any vehicle type"
          />
          <Note tone="grey">
            {draft.vehicles ? `${ticked.size} of ${ids.length} vehicles ticked` : 'All vehicles'}
          </Note>
        </Stack>
        <CheckTree
          label="Vehicles"
          searchPlaceholder="Search vehicles…"
          groups={vehicleTree(matching)}
          selected={ticked}
          onChange={(keys) => set('vehicles', keys.size === ids.length ? null : [...keys])}
        />
      </FieldGrid>
    </Modal>
  );
}

export interface HistoryPick {
  vehicles: string[];
  /** yyyy-mm-dd */
  day: string;
}

/** The History filter: up to six vehicles and one day in the last seven. */
export function HistoryDrawer({
  open,
  onClose,
  value,
  onApply,
  vehicles,
  now,
}: {
  open: boolean;
  onClose: () => void;
  value: HistoryPick;
  onApply: (p: HistoryPick) => void;
  /** Vehicles that have reported at least once. */
  vehicles: LiveVehicle[];
  now: Date;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);
  const today = startOfDay(now);
  const min = dayKey(addDays(today, -6));
  const max = dayKey(today);
  const dayOk = draft.day >= min && draft.day <= max;
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="History filter"
      subtitle={`Choose up to ${MAX_REPLAY} vehicles and a day in the last 7 days`}
      icon="filter"
      width={520}
      notice={
        !dayOk ? (
          <Note tone="red">
            Pick a day from {min} to {max}.
          </Note>
        ) : undefined
      }
      footer={
        <>
          <Button icon="refresh" onClick={() => setDraft({ vehicles: [], day: max })}>
            Reset
          </Button>
          <Button
            variant="primary"
            icon="play"
            disabled={!draft.vehicles.length || !dayOk}
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            Show history
          </Button>
        </>
      }
    >
      <FormSection title="Day" icon="calendar" cols={1}>
        <DateField
          label="Day"
          value={draft.day}
          min={min}
          max={max}
          onChange={(d) => setDraft({ ...draft, day: d })}
          hint="Today or one of the 6 days before it."
        />
      </FormSection>
      <FormSection title="Vehicles" icon="vehicles" cols={1}>
        <FullRow>
          <CheckTree
            label="Vehicles"
            searchPlaceholder="Search vehicles…"
            max={MAX_REPLAY}
            groups={vehicleTree(vehicles)}
            selected={new Set(draft.vehicles)}
            onChange={(keys) =>
              setDraft({
                ...draft,
                vehicles: vehicles.map((v) => v.id).filter((id) => keys.has(id)),
              })
            }
          />
        </FullRow>
      </FormSection>
    </Drawer>
  );
}
