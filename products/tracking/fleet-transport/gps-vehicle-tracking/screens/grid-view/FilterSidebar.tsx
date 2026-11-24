// The Grid View's "Vehicle Filters" panel (approved design, Desktop/vs/Grid-View.html): Operator,
// Sensor, Device, Location and Group sections; Submit applies, Reset clears. Built from
// @iotify/ui. People, geofences, vehicle types and groups are real; readings are demo.
import {
  AutoGrid,
  Button,
  CheckTree,
  ChoiceField,
  Field,
  FilterPanel,
  FilterSection,
  SelectField,
  SwitchField,
  ToolButton,
  type IconName,
} from '@iotify/ui';
import { BATTERY_LEVELS, type SensorKind } from './telemetry';
import { countFilters, type Filters } from './filters';

export interface Option {
  value: string;
  label: string;
}

export interface FilterChoices {
  fleetManagers: Option[];
  supervisors: Option[];
  operators: Option[];
  geofences: Option[];
  vehicleTypes: Option[];
  /** Group name and how many vehicles are in it. */
  groups: { name: string; count: number }[];
}

const SENSORS: { key: SensorKind; label: string; icon: IconName }[] = [
  { key: 'temperature', label: 'Temperature', icon: 'thermo' },
  { key: 'load', label: 'Load', icon: 'chart' },
  { key: 'door', label: 'Door', icon: 'door' },
  { key: 'ac', label: 'AC', icon: 'snow' },
];

function PersonSelect({
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

export function FilterSidebar({
  draft,
  onDraft,
  applied,
  choices,
  collapsed,
  onCollapsedChange,
  onReset,
  onSubmit,
}: {
  draft: Filters;
  onDraft: (f: Filters) => void;
  /** The filters now in use (for the "N filters applied" line). */
  applied: Filters;
  choices: FilterChoices;
  collapsed: boolean;
  onCollapsedChange: (c: boolean) => void;
  onReset: () => void;
  onSubmit: () => void;
}) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onDraft({ ...draft, [k]: v });
  const n = countFilters(applied);
  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);
  const allGroups = choices.groups.map((g) => g.name);
  const count = (keys: (keyof Filters)[]) => countFilters(applied, keys) || undefined;
  return (
    <FilterPanel
      title="Vehicle Filters"
      subtitle={n ? `${n} filter${n === 1 ? '' : 's'} applied` : 'No filters applied'}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      footer={
        <>
          <Button icon="refresh" onClick={onReset}>
            Reset
          </Button>
          <Button variant="primary" onClick={onSubmit} disabled={!dirty}>
            Submit
          </Button>
        </>
      }
    >
      <FilterSection
        title="Operator"
        icon="user"
        badge={count(['fleetManager', 'supervisor', 'operator', 'unassigned'])}
      >
        <PersonSelect
          label="Fleet Manager"
          empty="No fleet manager recorded"
          value={draft.fleetManager}
          options={choices.fleetManagers}
          onChange={(v) => set('fleetManager', v)}
        />
        <PersonSelect
          label="Supervisor"
          empty="No supervisor recorded"
          value={draft.supervisor}
          options={choices.supervisors}
          onChange={(v) => set('supervisor', v)}
        />
        <PersonSelect
          label="Vehicle Operator"
          empty="No vehicle operator recorded"
          value={draft.operator}
          options={choices.operators}
          onChange={(v) => set('operator', v)}
        />
        <SwitchField
          label="Unassigned operator only"
          hint="Vehicles with no operator assigned"
          checked={draft.unassigned}
          onChange={(v) => set('unassigned', v)}
        />
      </FilterSection>
      <FilterSection
        title="Sensor"
        icon="signal"
        badge={count(['ignition', 'sensors', 'ac', 'belt', 'door', 'outOfRange'])}
      >
        <ChoiceField
          label="Ignition"
          value={draft.ignition}
          onChange={(v) => set('ignition', v)}
          options={[
            { value: 'any', label: 'Any' },
            { value: 'on', label: 'On' },
            { value: 'off', label: 'Off' },
          ]}
        />
        <Field label="Installed sensors">
          <AutoGrid min={110} gap={6}>
            {SENSORS.map((s) => {
              const on = draft.sensors.includes(s.key);
              return (
                <ToolButton
                  key={s.key}
                  icon={s.icon}
                  active={on}
                  onClick={() =>
                    set(
                      'sensors',
                      on ? draft.sensors.filter((x) => x !== s.key) : [...draft.sensors, s.key],
                    )
                  }
                >
                  {s.label}
                </ToolButton>
              );
            })}
          </AutoGrid>
        </Field>
        <ChoiceField
          label="AC"
          value={draft.ac}
          onChange={(v) => set('ac', v)}
          options={[
            { value: 'any', label: 'Any' },
            { value: 'on', label: 'On' },
            { value: 'off', label: 'Off' },
          ]}
        />
        <ChoiceField
          label="Seat Belt"
          value={draft.belt}
          onChange={(v) => set('belt', v)}
          options={[
            { value: 'any', label: 'Any' },
            { value: 'fastened', label: 'Fastened' },
            { value: 'unfastened', label: 'Unfastened' },
          ]}
        />
        <ChoiceField
          label="Door"
          value={draft.door}
          onChange={(v) => set('door', v)}
          options={[
            { value: 'any', label: 'Any' },
            { value: 'open', label: 'Open' },
            { value: 'closed', label: 'Closed' },
          ]}
        />
        <SwitchField
          label="Out-of-range readings only"
          hint="Sensors outside their set limits"
          checked={draft.outOfRange}
          onChange={(v) => set('outOfRange', v)}
        />
      </FilterSection>
      <FilterSection
        title="Device"
        icon="chip"
        defaultOpen={false}
        badge={count(['gps', 'externalBattery', 'gsm', 'internalBattery'])}
      >
        <ChoiceField
          label="GPS"
          value={draft.gps}
          onChange={(v) => set('gps', v)}
          options={[
            { value: 'any', label: 'Any' },
            { value: 'available', label: 'Available' },
            { value: 'unavailable', label: 'Not available' },
          ]}
        />
        <ChoiceField
          label="External Battery"
          value={draft.externalBattery}
          onChange={(v) => set('externalBattery', v)}
          options={[
            { value: 'any', label: 'Any' },
            { value: 'connected', label: 'Connected' },
            { value: 'disconnected', label: 'Disconnected' },
          ]}
        />
        <SelectField
          label="GSM"
          value={draft.gsm}
          onChange={(v) => set('gsm', v as Filters['gsm'])}
          options={[
            { value: 'any', label: 'Any GSM signal' },
            { value: 'strong', label: 'Strong signal (3–5)' },
            { value: 'weak', label: 'Weak signal (1–2)' },
            { value: 'none', label: 'No signal' },
          ]}
        />
        <SelectField
          label="Internal Battery"
          value={draft.internalBattery}
          onChange={(v) => set('internalBattery', v as Filters['internalBattery'])}
          options={[
            { value: 'any', label: 'Any internal battery' },
            ...BATTERY_LEVELS.map((b) => ({ value: b, label: b })),
          ]}
        />
      </FilterSection>
      <FilterSection title="Location" icon="geofence" badge={count(['geofence'])}>
        <SelectField
          label="Geofence"
          value={draft.geofence}
          onChange={(v) => set('geofence', v)}
          options={choices.geofences}
          placeholder={choices.geofences.length ? 'Any geofence' : 'No geofences yet'}
          disabled={!choices.geofences.length}
        />
      </FilterSection>
      <FilterSection title="Group" icon="layers" badge={count(['vehicleType', 'groups'])}>
        <SelectField
          label="Vehicle type"
          value={draft.vehicleType}
          onChange={(v) => set('vehicleType', v)}
          options={choices.vehicleTypes}
          placeholder="Any type"
        />
        <CheckTree
          label="Groups"
          searchPlaceholder="Search groups…"
          groups={[
            {
              key: 'all',
              label: 'Select all',
              items: choices.groups.map((g) => ({
                key: g.name,
                label: g.name,
                detail: String(g.count),
              })),
            },
          ]}
          selected={new Set(draft.groups ?? allGroups)}
          onChange={(keys) =>
            set(
              'groups',
              keys.size === allGroups.length ? null : allGroups.filter((g) => keys.has(g)),
            )
          }
        />
      </FilterSection>
    </FilterPanel>
  );
}
