// Manage > Operator: the Add / Edit Operator drawer (approved design, Desktop/vs/Manage-Operator.html):
// "Operator Details" and "Documents" sections, Reset and Add Operator / Save Changes. Saves one
// proto_vehicle.operators row; Neon's error text is shown as it is.
import { useMemo, useState } from 'react';
import {
  Button,
  DateField,
  Drawer,
  FieldAction,
  FieldGrid,
  FileField,
  FormSection,
  FullRow,
  HueChip,
  Modal,
  Note,
  RadioGroupField,
  SelectField,
  Stack,
  TextField,
  useToast,
} from '@iotify/ui';
import { useSaveRecord, type OperatorsRow } from '@iotify/data';
import {
  COUNTRIES,
  DESIGNATIONS,
  LICENSE_CATEGORIES,
  blankOperator,
  choices,
  citiesOf,
  fromRow,
  newOperatorId,
  problems,
  statesOf,
  toRow,
  type OperatorForm,
} from './operator-form';

const opts = (list: string[]) => list.map((v) => ({ value: v, label: v }));

export function OperatorDrawer({
  record,
  companyId,
  country,
  operators,
  onClose,
}: {
  /** The operator to edit; null adds a new one. */
  record: OperatorsRow | null;
  companyId: string;
  /** The company's country (first choice for a new operator). */
  country: string;
  /** The company's operators (cities already used, new id). */
  operators: OperatorsRow[];
  onClose: () => void;
}) {
  const initial = useMemo(
    () => (record ? fromRow(record) : blankOperator(country)),
    [record, country],
  );
  const [f, setF] = useState<OperatorForm>(initial);
  const [tried, setTried] = useState(false);
  const [extra, setExtra] = useState<{ city: string[]; state: string[] }>({ city: [], state: [] });
  const [adding, setAdding] = useState<'city' | 'state' | null>(null);
  const save = useSaveRecord();
  const toast = useToast();

  const set = <K extends keyof OperatorForm>(k: K, v: OperatorForm[K]) =>
    setF((p) => ({ ...p, [k]: v }));
  const used = (k: 'city' | 'state') =>
    operators.filter((o) => (o.country ?? '') === f.country).map((o) => o[k]);
  const cityOptions = choices(citiesOf(f.country), used('city'), extra.city, [f.city]);
  const stateOptions = choices(statesOf(f.country), used('state'), extra.state, [f.state]);
  const issues = problems(f);

  const submit = () => {
    setTried(true);
    if (issues.length) return;
    const id = record?.id ?? newOperatorId(companyId, operators);
    save.mutate('operators', toRow(f, id, companyId), {
      onSuccess: () => {
        toast(record ? `${f.name.trim()} saved` : `${f.name.trim()} added`);
        onClose();
      },
    });
  };

  const notice = save.error ? (
    <Note tone="red">Not saved: {save.error.message}</Note>
  ) : tried && issues.length ? (
    <Note tone="red">{issues.join(' ')}</Note>
  ) : null;

  return (
    <Drawer
      open
      onClose={onClose}
      icon={record ? 'edit' : 'plus'}
      title={record ? 'Edit Operator' : 'Add Operator'}
      subtitle={record ? `Update operator ${record.name}` : 'Add and configure an operator'}
      notice={notice}
      footer={
        <>
          <Button
            onClick={() => {
              setF(initial);
              setTried(false);
              save.reset();
            }}
          >
            Reset
          </Button>
          <Button variant="primary" onClick={submit} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : record ? 'Save Changes' : 'Add Operator'}
          </Button>
        </>
      }
    >
      <FormSection id="details" title="Operator Details" icon="info">
        <TextField label="Operator Name" required value={f.name} onChange={(v) => set('name', v)} />
        <TextField
          label="Tag Id"
          placeholder="e.g. OPR-1042"
          value={f.tag_id}
          onChange={(v) => set('tag_id', v)}
        />
        <SelectField
          label="Designation"
          placeholder="Select…"
          options={opts(choices(DESIGNATIONS, [f.designation]))}
          value={f.designation}
          onChange={(v) => set('designation', v)}
        />
        <TextField
          label="Email Address"
          type="email"
          value={f.email}
          onChange={(v) => set('email', v)}
        />
        <TextField
          label="Contact No"
          required
          type="tel"
          placeholder="e.g. +966 50 100 1001"
          value={f.contact_no}
          onChange={(v) => set('contact_no', v)}
        />
        <TextField
          label="Emergency Contact No"
          type="tel"
          placeholder="e.g. +966 55 200 3004"
          value={f.emergency_contact_no}
          onChange={(v) => set('emergency_contact_no', v)}
        />
        <FullRow>
          <FieldGrid>
            <TextField
              label="Address Line 1"
              required
              value={f.address_line1}
              onChange={(v) => set('address_line1', v)}
            />
            <TextField
              label="Address Line 2"
              value={f.address_line2}
              onChange={(v) => set('address_line2', v)}
            />
          </FieldGrid>
        </FullRow>
        <SelectField
          label="City"
          required
          action={<FieldAction onClick={() => setAdding('city')} />}
          placeholder="Select…"
          options={opts(cityOptions)}
          value={f.city}
          onChange={(v) => set('city', v)}
        />
        <SelectField
          label="State"
          required
          action={<FieldAction onClick={() => setAdding('state')} />}
          placeholder="Select…"
          options={opts(stateOptions)}
          value={f.state}
          onChange={(v) => set('state', v)}
        />
        <SelectField
          label="Country"
          required
          placeholder="Select country…"
          options={opts(choices(COUNTRIES, [f.country]))}
          value={f.country}
          onChange={(v) => setF((p) => ({ ...p, country: v, city: '', state: '' }))}
        />
        <TextField
          label="Postal/Pin Code"
          required
          value={f.postal_code}
          onChange={(v) => set('postal_code', v)}
        />
        <TextField
          label="Branch Location"
          value={f.branch_location}
          onChange={(v) => set('branch_location', v)}
        />
        <DateField
          label="Date of Birth"
          value={f.date_of_birth}
          onChange={(v) => set('date_of_birth', v)}
        />
        <DateField
          label="Date of Joining"
          value={f.date_of_joining}
          onChange={(v) => set('date_of_joining', v)}
        />
        <DateField
          label="Date of Leaving"
          value={f.date_of_leaving}
          min={f.date_of_joining || undefined}
          onChange={(v) => set('date_of_leaving', v)}
        />
        <TextField
          label="Insurance Number"
          value={f.insurance_number}
          onChange={(v) => set('insurance_number', v)}
        />
        <TextField
          label="License Number"
          value={f.license_number}
          onChange={(v) => set('license_number', v)}
        />
        <SelectField
          label="License Category"
          placeholder="Select category..."
          options={opts(choices(LICENSE_CATEGORIES, [f.license_category]))}
          value={f.license_category}
          onChange={(v) => set('license_category', v)}
        />
        <DateField
          label="License Expiry Date"
          value={f.license_expiry}
          onChange={(v) => set('license_expiry', v)}
        />
        <FullRow>
          <RadioGroupField
            label="Status"
            options={opts(['Active', 'Inactive'])}
            value={f.status}
            onChange={(v) => set('status', v as OperatorForm['status'])}
          />
        </FullRow>
      </FormSection>

      <FormSection id="documents" title="Documents" icon="quotes">
        <FullRow>
          <FieldGrid>
            <FileField
              label="Attach ID Proof"
              accept=".pdf,.jpg,.jpeg,.png"
              hint={f.id_proof_name || undefined}
              onFiles={(files) => set('id_proof_name', files[0]?.name ?? f.id_proof_name)}
            />
            <FileField
              label="License Proof"
              accept=".pdf,.jpg,.jpeg,.png"
              hint={f.license_proof_name || undefined}
              onFiles={(files) => set('license_proof_name', files[0]?.name ?? f.license_proof_name)}
            />
          </FieldGrid>
        </FullRow>
        <FullRow span={2}>
          <FileField
            label="Upload Files"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            hint="PDF, JPG or PNG · up to 20 MB per file. Prototype: only the file names are saved."
            onFiles={(files) =>
              set(
                'document_names',
                choices(
                  f.document_names,
                  files.map((x) => x.name),
                ),
              )
            }
          />
          <Stack gap={6} wrap>
            {f.document_names.length ? (
              <>
                {f.document_names.map((n) => (
                  <HueChip key={n} hue="slate" icon="quotes">
                    {n}
                  </HueChip>
                ))}
                <Button size="sm" variant="ghost" onClick={() => set('document_names', [])}>
                  Remove all
                </Button>
              </>
            ) : (
              <Note tone="grey">No files attached yet</Note>
            )}
          </Stack>
        </FullRow>
      </FormSection>

      {adding && (
        <AddChoice
          what={adding === 'city' ? 'City' : 'State'}
          country={f.country}
          onClose={() => setAdding(null)}
          onAdd={(v) => {
            setExtra((p) => ({ ...p, [adding]: [...p[adding], v] }));
            set(adding, v);
            setAdding(null);
          }}
        />
      )}
    </Drawer>
  );
}

/** "+ Add" beside City / State: a new choice, kept with this operator when it is saved. */
function AddChoice({
  what,
  country,
  onAdd,
  onClose,
}: {
  what: string;
  country: string;
  onAdd: (value: string) => void;
  onClose: () => void;
}) {
  const [v, setV] = useState('');
  const ok = v.trim().length > 0;
  return (
    <Modal
      open
      onClose={onClose}
      title={`Add ${what.toLowerCase()}`}
      maxWidth={420}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!ok} onClick={() => onAdd(v.trim())}>
            Add
          </Button>
        </>
      }
    >
      <TextField
        label={`${what} name`}
        hint={`Added to the choices${country ? ` for ${country}` : ''}; saved with this operator.`}
        value={v}
        onChange={setV}
      />
    </Modal>
  );
}
