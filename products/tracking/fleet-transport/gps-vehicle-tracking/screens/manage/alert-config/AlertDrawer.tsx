// Manage > Alert Configuration: the Add / Edit Alert drawer (approved design,
// Desktop/vs/Manage-Alert-Configuration.html). Three columns: the alert types to choose, the
// vehicles they apply to, and the chosen alerts' Settings / Escalation / Review tabs. As in the
// design, each chosen alert is submitted on its own ("Submit Overspeed"): one transaction that
// saves a proto_vehicle.alert_configs row per checked vehicle (a vehicle that already has that
// alert keeps its row, which is updated).
import { useMemo, useState } from 'react';
import {
  Button,
  CheckTree,
  ChipTabs,
  ChoiceGroup,
  ColumnPanel,
  Drawer,
  DrawerColumns,
  HueToggle,
  Note,
  SearchInput,
  Stack,
  Tabs,
  useToast,
  type CheckTreeGroup,
} from '@iotify/ui';
import { useSaveBatch, type AlertConfigsRow } from '@iotify/data';
import type { FleetVehicle } from '../../../demo/fleet';
import { ALERT_TYPES, CATEGORIES, CHOOSABLE, alertType } from './alert-types';
import { checks, defaults, fromConfig, idMaker, toRows, type AlertSettings } from './alert-form';
import { EscalationTab, ReviewTab, SettingsTab } from './AlertTabs';

type Tab = 'settings' | 'escalation' | 'review';
const TABS: { key: Tab; label: string }[] = [
  { key: 'settings', label: 'Settings' },
  { key: 'escalation', label: 'Escalation' },
  { key: 'review', label: 'Review' },
];
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const todayIso = () => new Date().toISOString().slice(0, 10);

export function AlertDrawer({
  edit,
  vehicles,
  configs,
  companyId,
  onClose,
}: {
  /** The row to edit; null adds alerts. */
  edit: AlertConfigsRow | null;
  /** The company's vehicles (real). */
  vehicles: FleetVehicle[];
  /** The company's saved alert settings. */
  configs: AlertConfigsRow[];
  companyId: string;
  onClose: () => void;
}) {
  const first = edit ? alertType(edit.alert_type) : alertType('Overspeed');
  const start = (name: string): AlertSettings => {
    const type = alertType(name);
    return edit && name === first.name ? fromConfig(edit, type) : defaults(type);
  };
  const [chosen, setChosen] = useState<string[]>([first.name]);
  const [focus, setFocus] = useState(first.name);
  const [settings, setSettings] = useState<Record<string, AlertSettings>>(() => ({
    [first.name]: start(first.name),
  }));
  const [checked, setChecked] = useState<Set<string>>(() => new Set(edit ? [edit.asset_id] : []));
  const [tab, setTab] = useState<Tab>('settings');
  const [done, setDone] = useState<Set<string>>(new Set());
  const [tried, setTried] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const save = useSaveBatch();
  const toast = useToast();

  const type = alertType(focus);
  const s = settings[focus] ?? start(focus);
  const today = todayIso();
  const plateOf = useMemo(() => new Map(vehicles.map((v) => [v.id, v.plate])), [vehicles]);
  const assetIds = [...checked];
  const plates = assetIds.map((id) => plateOf.get(id) ?? id).sort();
  const results = checks(type, s, checked.size, today);
  const ok = results.every((r) => r.ok);

  const groups = useMemo<CheckTreeGroup[]>(() => {
    const by = new Map<string, FleetVehicle[]>();
    for (const v of vehicles)
      by.set(v.group ?? 'No group', [...(by.get(v.group ?? 'No group') ?? []), v]);
    return [...by.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([g, list]) => ({
        key: g,
        label: g,
        items: list
          .map((v) => ({ key: v.id, label: v.plate }))
          .sort((a, b) => a.label.localeCompare(b.label, 'en', { numeric: true })),
      }));
  }, [vehicles]);

  // ---- changes
  const set = (patch: Partial<AlertSettings>) => {
    setSettings((p) => ({ ...p, [focus]: { ...s, ...patch } }));
    setDone((d) => {
      const n = new Set(d);
      n.delete(focus);
      return n;
    });
    save.reset();
  };
  const toggle = (name: string) => {
    if (edit) return;
    if (chosen.includes(name)) {
      if (chosen.length === 1) return;
      const rest = chosen.filter((x) => x !== name);
      setChosen(rest);
      if (focus === name) setFocus(rest[rest.length - 1]!);
    } else {
      setChosen([...chosen, name]);
      setSettings((p) => (p[name] ? p : { ...p, [name]: start(name) }));
      setFocus(name);
      setTab('settings');
    }
    save.reset();
  };
  const selectAll = () => {
    if (edit) return;
    const shown = CHOOSABLE.map((a) => a.name);
    const all = chosen.length === shown.length;
    if (all) {
      setChosen([focus]);
      return;
    }
    setChosen([...chosen, ...shown.filter((n) => !chosen.includes(n))]);
    setSettings((p) => {
      const next = { ...p };
      for (const n of shown) next[n] ??= start(n);
      return next;
    });
  };
  const setVehicles = (keys: Set<string>) => {
    // Editing one row: its vehicle stays checked (the settings can be copied to more vehicles).
    if (edit) keys.add(edit.asset_id);
    setChecked(new Set(keys));
    setDone(new Set());
    save.reset();
  };
  const reset = () => {
    setSettings((p) => ({ ...p, [focus]: start(focus) }));
    setTried((t) => {
      const n = new Set(t);
      n.delete(focus);
      return n;
    });
    save.reset();
  };

  // ---- submit the focused alert
  const submit = () => {
    setTried((t) => new Set(t).add(focus));
    if (!ok) return;
    const rows = toRows(type, s, assetIds, companyId, configs, idMaker(companyId, configs));
    save.mutate(
      { upserts: [{ table: 'alert_configs', rows }] },
      {
        onSuccess: () => {
          const nextDone = new Set(done).add(focus);
          setDone(nextDone);
          const what = `${type.name} saved for ${plural(rows.length, 'vehicle')}`;
          const left = chosen.filter((n) => !nextDone.has(n));
          if (!left.length) {
            toast(
              chosen.length > 1
                ? `${plural(chosen.length, 'alert')} saved for ${plural(rows.length, 'vehicle')}`
                : what,
            );
            onClose();
          } else {
            toast(`${what}. ${plural(left.length, 'alert')} left to submit.`);
            setFocus(left[0]!);
            setTab('settings');
          }
        },
      },
    );
  };

  const many = chosen.length > 1;
  const name = many ? ` ${type.name}` : '';
  const bad = results.filter((r) => !r.ok);
  const notice = save.error ? (
    <Note tone="red">Not saved: {save.error.message}</Note>
  ) : tried.has(focus) && bad.length ? (
    <Note tone="red">
      Can&apos;t submit {type.name} yet: {bad.map((r) => r.why).join('; ')}.
    </Note>
  ) : null;

  const query = q.trim().toLowerCase();
  const replaced = assetIds
    .filter((id) =>
      configs.some(
        (c) =>
          c.asset_id === id &&
          c.alert_type.toLowerCase() === type.name.toLowerCase() &&
          c.id !== edit?.id,
      ),
    )
    .map((id) => plateOf.get(id) ?? id);

  return (
    <Drawer
      open
      onClose={onClose}
      width={1100}
      icon={edit ? 'edit' : 'bell'}
      title={edit ? 'Edit Alert' : 'Add Alert'}
      subtitle={
        edit
          ? `${plateOf.get(edit.asset_id) ?? edit.asset_id} · ${first.name}`
          : `${plural(chosen.length, 'alert name')} · ${plural(checked.size, 'vehicle')} selected`
      }
      notice={notice}
      footer={
        <>
          <Button onClick={reset}>Reset{name}</Button>
          <Button variant="primary" onClick={submit} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : edit ? 'Save Changes' : `Submit${name}`}
          </Button>
        </>
      }
    >
      <DrawerColumns>
        <ColumnPanel
          icon="bell"
          title="Alerts"
          head={
            <>
              <SearchInput value={q} onChange={setQ} placeholder="Search Alert Name" />
              <Stack justify="space-between">
                <b>
                  {chosen.length} / {CHOOSABLE.length}
                </b>
                {!edit && (
                  <Button size="sm" variant="ghost" onClick={selectAll}>
                    {chosen.length === CHOOSABLE.length ? 'Clear All' : 'Select All'}
                  </Button>
                )}
              </Stack>
            </>
          }
        >
          {CATEGORIES.map((cat) => {
            const list = ALERT_TYPES.filter(
              (a) => a.category === cat && (!query || a.name.toLowerCase().includes(query)),
            );
            if (!list.length) return null;
            return (
              <ChoiceGroup key={cat} title={cat}>
                {list.map((a) => {
                  const on = chosen.includes(a.name);
                  const unavailable = a.available === false;
                  return (
                    <HueToggle
                      key={a.name}
                      hue={a.hue}
                      icon={a.icon}
                      selected={on}
                      disabled={unavailable || (!!edit && !on)}
                      note={unavailable ? 'Not available yet' : undefined}
                      title={
                        on && chosen.length === 1
                          ? 'At least one alert stays selected'
                          : on
                            ? 'Click to remove'
                            : 'Click to select'
                      }
                      onClick={() => toggle(a.name)}
                    >
                      {a.name}
                    </HueToggle>
                  );
                })}
              </ChoiceGroup>
            );
          })}
          {!CATEGORIES.some((c) =>
            ALERT_TYPES.some((a) => a.category === c && a.name.toLowerCase().includes(query)),
          ) && <Note tone="grey">No alert matches “{q}”.</Note>}
        </ColumnPanel>

        <ColumnPanel
          icon="vehicles"
          title="Vehicles"
          subtitle="The selected alerts apply to every vehicle checked here."
        >
          <CheckTree
            label="Vehicles"
            groups={groups}
            selected={checked}
            onChange={setVehicles}
            searchPlaceholder="Search Plate Number"
          />
        </ColumnPanel>

        <ColumnPanel
          label="Alert settings"
          head={
            <Stack dir="col" gap={8} align="stretch">
              <span>
                Selected Alerts: <b>{chosen.length}</b> · Submitted <b>{done.size}</b> of{' '}
                {chosen.length}
              </span>
              <ChipTabs
                label="Chosen alerts"
                value={focus}
                onChange={(k) => setFocus(k)}
                tabs={chosen.map((n) => {
                  const t = alertType(n);
                  const st = settings[n] ?? start(n);
                  const fine = checks(t, st, checked.size, today).every((r) => r.ok);
                  return {
                    key: n,
                    label: n,
                    hue: t.hue,
                    mark: done.has(n) ? 'done' : tried.has(n) && !fine ? 'error' : undefined,
                  };
                })}
              />
              <Stack justify="space-between" wrap>
                <small>
                  {many
                    ? `${type.name} · ${chosen.indexOf(focus) + 1} of ${chosen.length}`.toUpperCase()
                    : ''}
                </small>
                <Tabs label="Alert sections" tabs={TABS} value={tab} onChange={setTab} />
              </Stack>
            </Stack>
          }
        >
          {tab === 'settings' && (
            <SettingsTab
              type={type}
              s={s}
              set={set}
              tried={tried.has(focus)}
              onEscalation={() => setTab('escalation')}
            />
          )}
          {tab === 'escalation' && (
            <EscalationTab
              type={type}
              s={s}
              set={set}
              tried={tried.has(focus)}
              vehicles={checked.size}
              onSettings={() => setTab('settings')}
            />
          )}
          {tab === 'review' && (
            <ReviewTab type={type} s={s} plates={plates} replaced={replaced} results={results} />
          )}
        </ColumnPanel>
      </DrawerColumns>
    </Drawer>
  );
}
