// Table structure on the developer's own branch: New table, Change table, Drop table.
// The dev server builds and runs the SQL and keeps it as a numbered migration file
// (db/migrations/<developer>/), so the change isn't lost when work is merged (CORE_RULES rule 7).
import { useState } from 'react';
import {
  Button,
  CheckboxField,
  FieldGrid,
  IconButton,
  Modal,
  Note,
  SelectField,
  Stack,
  TextField,
  useToast,
} from '@iotify/ui';
import {
  BRANCH_DB_TYPES,
  useBranchDbStructure,
  type BranchDbColumn,
  type BranchDbNewColumn,
  type BranchDbStructureChange,
  type BranchDbStructureReply,
} from '@iotify/data';

const TYPE_OPTIONS = BRANCH_DB_TYPES.map((t) => ({ value: t, label: t }));
const NEW_SCHEMA = '__new';

/** Runs a change, then says what happened and where the migration file went. */
function useApply(onDone: (reply: BranchDbStructureReply) => void) {
  const structure = useBranchDbStructure();
  const toast = useToast();
  const apply = (change: BranchDbStructureChange, failTitle: string) =>
    structure.mutate(change, {
      onSuccess: (reply) => {
        toast({
          type: change.op === 'drop_table' || change.op === 'drop_column' ? 'delete' : 'update',
          title: reply.done ?? 'Done',
          desc: reply.migration ? `Kept as ${reply.migration}` : undefined,
        });
        if (reply.migrationError)
          toast({ type: 'warning', title: 'No migration file', desc: reply.migrationError });
        onDone(reply);
      },
      onError: (e) => toast({ type: 'error', title: failTitle, desc: e.message }),
    });
  return { apply, structure };
}

function CoreNote({ schema }: { schema: string }) {
  if (schema !== 'core') return null;
  return (
    <Note tone="amber">
      This changes a core table on your branch only. It doesn't reach main when your work is merged:
      that needs a core change request (docs/CORE_RULES.md rule 9).
    </Note>
  );
}

function MigrationNote() {
  return (
    <Note tone="grey">
      The change runs on your branch at once and is kept as the next numbered file in
      db/migrations/&lt;your name&gt;/.
    </Note>
  );
}

// ------------------------------------------------------------------ New table

const blankColumn = (): BranchDbNewColumn => ({ name: '', type: 'text', default: '' });

export function NewTableDialog({
  schemas,
  onClose,
  onCreated,
}: {
  schemas: string[];
  onClose: () => void;
  onCreated: (schema: string, table: string) => void;
}) {
  const [schemaChoice, setSchemaChoice] = useState('');
  const [newSchema, setNewSchema] = useState('');
  const [table, setTable] = useState('');
  const [columns, setColumns] = useState<BranchDbNewColumn[]>([
    { name: 'id', type: 'text', pk: true, default: '' },
  ]);
  const { apply, structure } = useApply((r) => {
    onCreated(r.schema!, r.table!);
    onClose();
  });
  const schema = schemaChoice === NEW_SCHEMA ? newSchema.trim() : schemaChoice;
  const setColumn = (i: number, patch: Partial<BranchDbNewColumn>) =>
    setColumns((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const ready = !!schema && !!table.trim() && columns.every((c) => c.name.trim());

  return (
    <Modal
      open
      onClose={onClose}
      title="New table"
      maxWidth={860}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!ready || structure.isPending}
            onClick={() =>
              apply(
                {
                  op: 'create_table',
                  schema,
                  table: table.trim(),
                  columns: columns.map((c) => ({ ...c, name: c.name.trim() })),
                },
                'Table not created',
              )
            }
          >
            {structure.isPending ? 'Creating…' : 'Create table'}
          </Button>
        </>
      }
    >
      {structure.error && <Note tone="red">{structure.error.message}</Note>}
      <FieldGrid>
        <SelectField
          label="Schema"
          required
          hint="Which schema the table goes in: core, telemetry, or another one."
          placeholder="Choose a schema"
          value={schemaChoice}
          onChange={setSchemaChoice}
          options={[
            ...schemas.map((s) => ({ value: s, label: s })),
            { value: NEW_SCHEMA, label: 'New schema…' },
          ]}
        />
        {schemaChoice === NEW_SCHEMA ? (
          <TextField
            label="New schema name"
            required
            hint="snake_case. A prototype's own schema starts with proto_."
            value={newSchema}
            onChange={setNewSchema}
            placeholder="proto_my_prototype"
          />
        ) : (
          <span />
        )}
        <TextField
          label="Table name"
          required
          hint="snake_case, e.g. vehicle_trips"
          value={table}
          onChange={setTable}
        />
      </FieldGrid>
      <CoreNote schema={schema} />
      {columns.map((c, i) => (
        <Stack key={i} align="end" wrap>
          <TextField
            label={i === 0 ? 'Column' : ''}
            value={c.name}
            onChange={(v) => setColumn(i, { name: v })}
            placeholder="column_name"
          />
          <SelectField
            label={i === 0 ? 'Type' : ''}
            value={c.type}
            onChange={(v) => setColumn(i, { type: v })}
            options={TYPE_OPTIONS}
          />
          <TextField
            label={i === 0 ? 'Default' : ''}
            value={c.default ?? ''}
            onChange={(v) => setColumn(i, { default: v })}
            placeholder="none, a value, now()"
          />
          <CheckboxField label="Key" checked={!!c.pk} onChange={(v) => setColumn(i, { pk: v })} />
          <CheckboxField
            label="Required"
            checked={!!c.required || !!c.pk}
            onChange={(v) => setColumn(i, { required: v })}
          />
          <IconButton
            icon="trash"
            label={`Remove column ${c.name || i + 1}`}
            onClick={() => setColumns((cs) => cs.filter((_, j) => j !== i))}
          />
        </Stack>
      ))}
      <Stack>
        <Button size="sm" icon="plus" onClick={() => setColumns((cs) => [...cs, blankColumn()])}>
          Add column
        </Button>
      </Stack>
      <MigrationNote />
    </Modal>
  );
}

// ------------------------------------------------------------------ Change table

type ChangeOp = 'add_column' | 'rename_column' | 'alter_type' | 'drop_column' | 'rename_table';
const CHANGE_OPTIONS: { value: ChangeOp; label: string }[] = [
  { value: 'add_column', label: 'Add a column' },
  { value: 'rename_column', label: 'Rename a column' },
  { value: 'alter_type', label: 'Change a column’s type' },
  { value: 'drop_column', label: 'Drop a column' },
  { value: 'rename_table', label: 'Rename the table' },
];

export function ChangeTableDialog({
  schema,
  table,
  columns,
  onClose,
  onRenamed,
}: {
  schema: string;
  table: string;
  columns: BranchDbColumn[];
  onClose: () => void;
  onRenamed: (table: string) => void;
}) {
  const [op, setOp] = useState<ChangeOp>('add_column');
  const [column, setColumn] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState('text');
  const [added, setAdded] = useState<BranchDbNewColumn>(blankColumn());
  const { apply, structure } = useApply((r) => {
    if (op === 'rename_table' && r.table) onRenamed(r.table);
    onClose();
  });
  const columnOptions = columns.map((c) => ({ value: c.name, label: `${c.name} (${c.type})` }));
  const change: BranchDbStructureChange | null =
    op === 'add_column'
      ? added.name.trim()
        ? { op, schema, table, column: { ...added, name: added.name.trim() } }
        : null
      : op === 'rename_table'
        ? to.trim()
          ? { op, schema, table, to: to.trim() }
          : null
        : !column
          ? null
          : op === 'rename_column'
            ? to.trim()
              ? { op, schema, table, column, to: to.trim() }
              : null
            : op === 'alter_type'
              ? { op, schema, table, column, type }
              : { op, schema, table, column };
  const dropping = op === 'drop_column';

  return (
    <Modal
      open
      onClose={onClose}
      title={`Change table · ${schema}.${table}`}
      maxWidth={720}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant={dropping ? 'danger' : 'primary'}
            disabled={!change || structure.isPending}
            onClick={() => change && apply(change, 'Not changed')}
          >
            {structure.isPending ? 'Changing…' : dropping ? 'Drop column' : 'Apply change'}
          </Button>
        </>
      }
    >
      {structure.error && <Note tone="red">{structure.error.message}</Note>}
      <CoreNote schema={schema} />
      <FieldGrid>
        <SelectField
          label="What to change"
          value={op}
          onChange={(v) => {
            setOp(v as ChangeOp);
            setColumn('');
            setTo('');
          }}
          options={CHANGE_OPTIONS}
        />
        {op !== 'add_column' && op !== 'rename_table' && (
          <SelectField
            label="Column"
            placeholder="Choose a column"
            value={column}
            onChange={setColumn}
            options={columnOptions}
          />
        )}
        {op === 'add_column' && (
          <>
            <TextField
              label="Column name"
              hint="snake_case"
              value={added.name}
              onChange={(v) => setAdded((a) => ({ ...a, name: v }))}
            />
            <SelectField
              label="Type"
              value={added.type}
              onChange={(v) => setAdded((a) => ({ ...a, type: v }))}
              options={TYPE_OPTIONS}
            />
            <TextField
              label="Default"
              hint="A value, now() or gen_random_uuid(). Needed for Required on a table with rows."
              value={added.default ?? ''}
              onChange={(v) => setAdded((a) => ({ ...a, default: v }))}
            />
            <CheckboxField
              label="Required"
              checked={!!added.required}
              onChange={(v) => setAdded((a) => ({ ...a, required: v }))}
            />
          </>
        )}
        {(op === 'rename_column' || op === 'rename_table') && (
          <TextField label="New name" hint="snake_case" value={to} onChange={setTo} />
        )}
        {op === 'alter_type' && (
          <SelectField label="New type" value={type} onChange={setType} options={TYPE_OPTIONS} />
        )}
      </FieldGrid>
      {dropping && (
        <Note tone="red">The column and all its values are removed. This can't be undone.</Note>
      )}
      {op === 'rename_table' && (
        <Note tone="amber">Screens and code that use the old name stop working until updated.</Note>
      )}
      <MigrationNote />
    </Modal>
  );
}

// ------------------------------------------------------------------ Drop table

export function DropTableDialog({
  schema,
  table,
  onClose,
  onDropped,
}: {
  schema: string;
  table: string;
  onClose: () => void;
  onDropped: () => void;
}) {
  const [typed, setTyped] = useState('');
  const { apply, structure } = useApply(() => {
    onDropped();
    onClose();
  });
  return (
    <Modal
      open
      onClose={onClose}
      title="Drop this table?"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            disabled={typed !== table || structure.isPending}
            onClick={() => apply({ op: 'drop_table', schema, table }, 'Table not dropped')}
          >
            {structure.isPending ? 'Dropping…' : 'Drop table'}
          </Button>
        </>
      }
    >
      {structure.error && <Note tone="red">{structure.error.message}</Note>}
      <p>
        <b>
          {schema}.{table}
        </b>{' '}
        and all its rows are removed from your branch. This can't be undone. If other tables link to
        it, Neon refuses and says which.
      </p>
      <CoreNote schema={schema} />
      <TextField
        label={`Type ${table} to confirm`}
        value={typed}
        onChange={setTyped}
        placeholder={table}
      />
      <MigrationNote />
    </Modal>
  );
}
