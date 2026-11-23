// Helpers shared by the Add Vehicle and Add Device drawers (approved GPS Platform design).
import { useState } from 'react';
import { Button, Modal, Note, TextField, type SelectOption } from '@iotify/ui';
import { useSaveRecord, useVehicleLookups, type VehicleLookupsRow } from '@iotify/data';
import { nextId } from '@iotify/app-kit';

/** `n` new ids after the highest existing one: DU20, DU21… */
export function nextIds(prefix: string, rows: { id: string }[], n: number) {
  const out: string[] = [];
  const all = [...rows];
  for (let i = 0; i < n; i++) {
    const id = nextId(prefix, all);
    out.push(id);
    all.push({ id });
  }
  return out;
}

/** "" → null, otherwise a number (null when it isn't one). */
export const num = (v: string) => (v.trim() === '' || Number.isNaN(Number(v)) ? null : Number(v));
/** "" → null. */
export const txt = (v: string) => (v.trim() === '' ? null : v.trim());

export type LookupKind = VehicleLookupsRow['kind'];
export const LOOKUP_NOUN: Record<LookupKind, string> = {
  category: 'category',
  vehicle_type: 'type',
  color: 'vehicle colour',
  make: 'make',
  model: 'model',
  fuel_type: 'fuel type',
  sim_provider: 'provider',
  sim_plan: 'plan',
};

/** The choices of one "+ Add" list, e.g. every make. `parent` limits models to their make. */
export function useLookupOptions() {
  const rows = useVehicleLookups();
  const list = rows.data ?? [];
  return {
    rows: list,
    options: (kind: LookupKind, parent?: string | null): SelectOption[] =>
      list
        .filter((r) => r.kind === kind && (kind !== 'model' || !parent || r.parent === parent))
        .map((r) => ({ value: r.value, label: r.value }))
        .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

/** "+ Add" dialog: one new choice for a list. A button action: saves at once. */
export function AddLookupModal({
  kind,
  parent,
  existing,
  onClose,
  onAdded,
}: {
  kind: LookupKind;
  parent?: string | null;
  existing: VehicleLookupsRow[];
  onClose: () => void;
  onAdded: (value: string) => void;
}) {
  const save = useSaveRecord();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const noun = LOOKUP_NOUN[kind];
  const add = async () => {
    const v = value.trim();
    if (!v) return setError(`Type the new ${noun}.`);
    try {
      await save.mutateAsync('vehicle_lookups', {
        id: nextId('LK', existing),
        kind,
        value: v,
        parent: kind === 'model' ? (parent ?? null) : null,
      });
      onAdded(v);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={`Add ${noun}`}
      maxWidth={420}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={save.isPending} onClick={add}>
            {save.isPending ? 'Adding…' : 'Add'}
          </Button>
        </>
      }
    >
      <TextField
        label={kind === 'model' && parent ? `New ${noun} for ${parent}` : `New ${noun}`}
        value={value}
        onChange={setValue}
        required
      />
      {error && (
        <Note tone="red" role="alert">
          {error}
        </Note>
      )}
    </Modal>
  );
}
