// IT-0036. Shapes of the Manage modules (Vehicle, Device, SIM Card, Operator), as the original
// page describes them: list columns, form sections and fields, choice lists.
import type { ReactNode } from 'react';

export type Values = Record<string, unknown>;

/** A choice in a form list. `parent` links a model to its make, a group to its parent group. */
export interface ListItem {
  id: string;
  label: string;
  parent?: string;
  image?: string;
  /** Set when another record already uses it (shown "(in use)", disabled). */
  usedBy?: string;
}
export type Lists = Record<string, ListItem[]>;

export interface FieldDef {
  key: string;
  label: string;
  type?:
    'text' | 'select' | 'multiselect' | 'radio' | 'date' | 'number' | 'files' | 'file' | 'tree';
  list?: string;
  required?: boolean;
  placeholder?: string;
  pattern?: string;
  hint?: string;
  keepOnEdit?: string;
  inputMode?: 'text' | 'tel' | 'numeric' | 'decimal' | 'email';
  inputType?: string;
  /** true = "+ Add" a new choice inline; a module id = open that module's form. */
  add?: true | string;
  parent?: string;
  span?: number;
  rowSpan?: number;
  half?: boolean;
  /** Not offered in Multi-Edit (each record has its own value). */
  perRecord?: boolean;
  options?: string[];
  maxMb?: number;
  images?: boolean;
  iconPicker?: { title: string; icons?: Record<string, string>; fallback: string };
}

export interface FormContext {
  values: Values;
  set: (key: string, value: unknown) => void;
  lists: Lists;
  can: (key: string) => boolean;
  canNest: (module: string) => boolean;
  multi: boolean;
  openNested: (module: string, field: string, multi?: boolean) => void;
}

export interface SectionDef {
  id: string;
  title: string;
  step?: string;
  icon: string;
  cols?: number;
  fields?: FieldDef[];
  lockedUnless?: string;
  render?: (ctx: FormContext) => ReactNode;
}

export interface ColumnDef {
  key: string;
  label: string;
  width: number;
  strong?: boolean;
  kind?: 'date' | 'status';
  image?: string;
  noServerFilter?: boolean;
}

export interface ModuleDef {
  id: string;
  label: string;
  noun: string;
  plural: string;
  icon: string;
  addLabel: string;
  formTitle?: string;
  formSubtitle?: string;
  submitLabel?: string;
  search: string;
  removeFrom?: string;
  multiEdit?: boolean;
  lists?: Record<string, (string | ListItem)[]>;
  name: (v: Values) => string | undefined;
  columns: ColumnDef[];
  stepper?: boolean;
  sections: SectionDef[];
  empty?: () => Values;
}

export interface Row {
  id: string;
  [key: string]: unknown;
}

/** What a module's data looks like to the grid and the form (Neon behind it). */
export interface ModuleSource {
  rows: (module: string) => { rows: Row[]; loading: boolean; error: unknown };
  get: (module: string, id: string) => Values;
  options: (module: string) => Lists;
  save: (module: string, id: string | null, values: Values) => Promise<{ id: string }>;
  remove: (module: string, id: string) => Promise<void>;
  addOption: (module: string, list: string, value: string, parent?: string) => Promise<ListItem>;
  /** Field keys that are saved; null = all. Others are greyed out. */
  editable?: (module: string) => string[] | null;
  canEdit: (module: string) => boolean;
  refresh: () => void;
}

export const fieldsOf = (m: ModuleDef) => m.sections.flatMap((s) => s.fields ?? []);
export const moduleById = (all: ModuleDef[], id: string) => all.find((m) => m.id === id) ?? all[0]!;
export const str = (v: unknown) => (v == null ? '' : String(v).trim());
export const strList = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((x) => x != null && x !== '').map(String)
    : v == null || v === ''
      ? []
      : [String(v)];
