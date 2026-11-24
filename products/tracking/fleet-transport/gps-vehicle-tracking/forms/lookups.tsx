// Helpers shared by the vehicle, device and SIM forms (approved design): new ids, text → value,
// and the "+ Add" choices (proto_vehicle.vehicle_lookups). Used by Manage here and by the
// Partner Portal (Assets, Stock).
import { useState } from 'react';
import { Button, Modal, Note, TextField, type SelectOption } from '@iotify/ui';
import {
  useCompanies,
  useSaveRecord,
  useVehicleLookups,
  type VehicleLookupsRow,
} from '@iotify/data';
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
/** A saved value as form text ("" for null). */
export const str = (v: unknown) => (v == null ? '' : String(v));
/** A saved date as yyyy-mm-dd ("" for null). */
export const day = (v: unknown) => (v ? String(v).slice(0, 10) : '');

/**
 * Who uses a form: a dealer (Partner Portal: their stock and companies) or a company (customer
 * apps: the company is fixed). Exactly one of the two is set.
 */
export interface Owner {
  /** Dealer use: the dealer's id. */
  dealer?: string;
  /** Company use: the company's id (fixed). */
  companyId?: string;
}

/** The dealer that owns new stock: the dealer itself, or the company's dealer. */
export function useOwnerDealer(owner: Owner): string | null {
  const company = useCompanies(
    { id: owner.companyId ?? '__none' },
    { enabled: !owner.dealer && !!owner.companyId },
  );
  return owner.dealer ?? company.data?.[0]?.dealer_id ?? null;
}

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

/** Keep a saved value selectable even when it isn't in the list (e.g. typed elsewhere). */
export const withCurrent = (options: SelectOption[], v: string): SelectOption[] =>
  v && !options.some((o) => o.value === v) ? [{ value: v, label: v }, ...options] : options;

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
