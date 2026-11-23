// Manage > Operator: the Add / Edit Operator form as plain values, its choices, the required
// fields (as in the design) and the row saved to proto_vehicle.operators. Pure; no React.
import type { OperatorsRow } from '@iotify/data';

export interface OperatorForm {
  name: string;
  tag_id: string;
  designation: string;
  email: string;
  contact_no: string;
  emergency_contact_no: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  branch_location: string;
  date_of_birth: string;
  date_of_joining: string;
  date_of_leaving: string;
  insurance_number: string;
  license_number: string;
  license_category: string;
  license_expiry: string;
  status: 'Active' | 'Inactive';
  id_proof_name: string;
  license_proof_name: string;
  document_names: string[];
}

/** The form's fields with their labels, in the design's order (for the "fill in" message). */
export const LABELS: Record<keyof OperatorForm, string> = {
  name: 'Operator Name',
  tag_id: 'Tag Id',
  designation: 'Designation',
  email: 'Email Address',
  contact_no: 'Contact No',
  emergency_contact_no: 'Emergency Contact No',
  address_line1: 'Address Line 1',
  address_line2: 'Address Line 2',
  city: 'City',
  state: 'State',
  country: 'Country',
  postal_code: 'Postal/Pin Code',
  branch_location: 'Branch Location',
  date_of_birth: 'Date of Birth',
  date_of_joining: 'Date of Joining',
  date_of_leaving: 'Date of Leaving',
  insurance_number: 'Insurance Number',
  license_number: 'License Number',
  license_category: 'License Category',
  license_expiry: 'License Expiry Date',
  status: 'Status',
  id_proof_name: 'Attach ID Proof',
  license_proof_name: 'License Proof',
  document_names: 'Upload Files',
};

/** Marked with a red * in the design. */
export const REQUIRED: (keyof OperatorForm)[] = [
  'name',
  'contact_no',
  'address_line1',
  'city',
  'state',
  'country',
  'postal_code',
];

export const DESIGNATIONS = ['Driver', 'Senior driver', 'Relief driver', 'Helper', 'Supervisor'];
export const LICENSE_CATEGORIES = ['Light', 'Medium', 'Heavy', 'Motorcycle', 'Bus'];
export const COUNTRIES = [
  'Saudi Arabia',
  'United Arab Emirates',
  'Qatar',
  'Kuwait',
  'Bahrain',
  'Oman',
  'India',
];
const CITIES: Record<string, string[]> = {
  'Saudi Arabia': ['Riyadh', 'Jeddah', 'Dammam', 'Khobar', 'Mecca', 'Medina'],
  'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah'],
  Qatar: ['Doha'],
  Kuwait: ['Kuwait City'],
  Bahrain: ['Manama'],
  Oman: ['Muscat'],
  India: ['Chennai', 'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Kochi'],
};
const STATES: Record<string, string[]> = {
  'Saudi Arabia': ['Riyadh Province', 'Makkah Province', 'Eastern Province', 'Madinah Province'],
  'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah'],
  Qatar: ['Doha'],
  Kuwait: ['Al Asimah'],
  Bahrain: ['Capital Governorate'],
  Oman: ['Muscat Governorate'],
  India: ['Tamil Nadu', 'Karnataka', 'Maharashtra', 'Delhi', 'Telangana', 'Kerala'],
};

/** Choices for a drop-down: the list, the values already used, extras added with "+ Add". */
export function choices(list: string[], ...more: (string | null | undefined)[][]): string[] {
  const out: string[] = [];
  for (const v of [...list, ...more.flat()]) if (v && !out.includes(v)) out.push(v);
  return out;
}
export const citiesOf = (country: string) => CITIES[country] ?? [];
export const statesOf = (country: string) => STATES[country] ?? [];

export function blankOperator(country: string): OperatorForm {
  return {
    name: '',
    tag_id: '',
    designation: '',
    email: '',
    contact_no: '',
    emergency_contact_no: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    country,
    postal_code: '',
    branch_location: '',
    date_of_birth: '',
    date_of_joining: '',
    date_of_leaving: '',
    insurance_number: '',
    license_number: '',
    license_category: '',
    license_expiry: '',
    status: 'Active',
    id_proof_name: '',
    license_proof_name: '',
    document_names: [],
  };
}

/** Dates arrive as "2028-03-31" or "2028-03-31T00:00:00…"; the date box wants yyyy-mm-dd. */
const day = (v: string | null | undefined) => (v ? String(v).slice(0, 10) : '');

export function fromRow(o: OperatorsRow): OperatorForm {
  return {
    name: o.name ?? '',
    tag_id: o.tag_id ?? '',
    designation: o.designation ?? '',
    email: o.email ?? '',
    contact_no: o.contact_no ?? '',
    emergency_contact_no: o.emergency_contact_no ?? '',
    address_line1: o.address_line1 ?? '',
    address_line2: o.address_line2 ?? '',
    city: o.city ?? '',
    state: o.state ?? '',
    country: o.country ?? '',
    postal_code: o.postal_code ?? '',
    branch_location: o.branch_location ?? '',
    date_of_birth: day(o.date_of_birth),
    date_of_joining: day(o.date_of_joining),
    date_of_leaving: day(o.date_of_leaving),
    insurance_number: o.insurance_number ?? '',
    license_number: o.license_number ?? '',
    license_category: o.license_category ?? '',
    license_expiry: day(o.license_expiry),
    status: o.status === 'Inactive' ? 'Inactive' : 'Active',
    id_proof_name: o.id_proof_name ?? '',
    license_proof_name: o.license_proof_name ?? '',
    document_names: o.document_names ?? [],
  };
}

/** What's wrong, in plain words (empty when the form can be saved). */
export function problems(f: OperatorForm): string[] {
  const out: string[] = [];
  const missing = REQUIRED.filter((k) => !String(f[k]).trim());
  if (missing.length) out.push(`Fill in ${missing.map((k) => LABELS[k]).join(', ')}.`);
  if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
    out.push('Email Address is not a valid address.');
  if (f.date_of_joining && f.date_of_leaving && f.date_of_leaving < f.date_of_joining)
    out.push('Date of Leaving is before Date of Joining.');
  return out;
}

/** Fields that are required and still empty (red ring). */
export const missing = (f: OperatorForm) => new Set(REQUIRED.filter((k) => !String(f[k]).trim()));

const txt = (v: string) => v.trim() || null;

/** The row to save (insert or update by id). */
export function toRow(f: OperatorForm, id: string, companyId: string): OperatorsRow {
  return {
    id,
    company_id: companyId,
    name: f.name.trim(),
    tag_id: txt(f.tag_id),
    designation: txt(f.designation),
    email: txt(f.email),
    contact_no: txt(f.contact_no),
    emergency_contact_no: txt(f.emergency_contact_no),
    address_line1: txt(f.address_line1),
    address_line2: txt(f.address_line2),
    city: txt(f.city),
    state: txt(f.state),
    country: txt(f.country),
    postal_code: txt(f.postal_code),
    branch_location: txt(f.branch_location),
    date_of_birth: f.date_of_birth || null,
    date_of_joining: f.date_of_joining || null,
    date_of_leaving: f.date_of_leaving || null,
    insurance_number: txt(f.insurance_number),
    license_number: txt(f.license_number),
    license_category: txt(f.license_category),
    license_expiry: f.license_expiry || null,
    status: f.status,
    id_proof_name: txt(f.id_proof_name),
    license_proof_name: txt(f.license_proof_name),
    document_names: f.document_names.length ? f.document_names : null,
  };
}

/** A new id for this company: OP-C1-1, OP-C1-2… (unique across companies). */
export function newOperatorId(companyId: string, rows: { id: string }[]): string {
  const prefix = `OP-${companyId}-`;
  let max = 0;
  for (const r of rows)
    if (r.id.startsWith(prefix)) max = Math.max(max, Number(r.id.slice(prefix.length)) || 0);
  return prefix + (max + 1);
}
