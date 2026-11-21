// The editing model (CLAUDE.md §4, docs/LEGACY_PARITY.md "Data and editing"):
//   - fields are read-only until Edit; Save writes, Cancel reverts;
//   - Save / Cancel sit on the record card; the bottom EditBar is only a reminder;
//   - failed saves show Neon's exact error with Try again and Cancel;
//   - leaving a page with unsaved changes asks: Save / Discard / Stay;
//   - Delete only inside Edit mode, always confirmed; refused with Neon's reason.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button, Card, EditBar, LinkButtonDanger, Modal, Note, Stack } from '@iotify/ui';
import type { DataError } from '@iotify/data';

/** What a page tells the shell while it's being edited. */
export interface EditState {
  /** Names of things with unsaved changes ("Asset Tipper 14"). Empty: editing, nothing changed. */
  changes: string[];
  saving: boolean;
  /** Neon's exact error text from the last failed save. */
  error: string | null;
  save: () => Promise<boolean>;
  discard: () => void;
}

interface EditContextValue {
  /** The page currently being edited (one at a time). */
  current: EditState | null;
  register: (id: string, s: EditState | null) => void;
  /** Run `go` now, or after the user chooses Save / Discard when there are unsaved changes. */
  guard: (go: () => void) => void;
}
const EditContext = createContext<EditContextValue | null>(null);

/** Wraps a page area (AppShell does this): EditBar reminder + leave guard. */
export function EditSessionProvider({ children }: { children: ReactNode }) {
  const [states, setStates] = useState<Record<string, EditState>>({});
  const [pending, setPending] = useState<(() => void) | null>(null);
  const register = useCallback((id: string, s: EditState | null) => {
    setStates((all) => {
      if (!s) {
        if (!(id in all)) return all;
        const rest = { ...all };
        delete rest[id];
        return rest;
      }
      return { ...all, [id]: s };
    });
  }, []);
  const current = Object.values(states)[0] ?? null;
  const dirty = !!current && current.changes.length > 0;
  const guard = useCallback((go: () => void) => (dirty ? setPending(() => go) : go()), [dirty]);

  // Closing or reloading the tab with unsaved changes: the browser asks.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const value = useMemo(() => ({ current, register, guard }), [current, register, guard]);
  return (
    <EditContext.Provider value={value}>
      {children}
      {current && (
        <EditBar
          changes={current.changes}
          error={current.error}
          saving={current.saving}
          onCancel={current.discard}
          onSave={() => void current.save()}
        />
      )}
      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title="Unsaved changes"
        maxWidth={420}
        footer={
          <>
            <Button onClick={() => setPending(null)}>Stay</Button>
            <Button
              variant="danger"
              onClick={() => {
                current?.discard();
                const go = pending;
                setPending(null);
                go?.();
              }}
            >
              Discard
            </Button>
            <Button
              variant="primary"
              disabled={current?.saving}
              onClick={async () => {
                if (current && (await current.save())) {
                  const go = pending;
                  setPending(null);
                  go?.();
                } else setPending(null);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <p className="ui-muted" style={{ margin: 0 }}>
          Save your changes before leaving this page?
        </p>
      </Modal>
    </EditContext.Provider>
  );
}

/** Asks Save / Discard / Stay before `go` when the page has unsaved changes. */
export function useLeaveGuard() {
  const ctx = useContext(EditContext);
  return ctx ? ctx.guard : (go: () => void) => go();
}

let nextId = 0;

/**
 * Edit state for one record: a draft copy while editing, which fields changed, and save /
 * cancel. `onSave` gets only the changed fields plus the key; throw (or reject) to show the
 * error. Registers with the shell for the EditBar and leave guard.
 */
export function useRecordEdit<R extends object>(
  row: R | undefined,
  opts: {
    /** Label for the EditBar, e.g. "Asset Tipper 14". */
    label: string;
    /** Key fields always sent with the changes. */
    keys?: (keyof R)[];
    onSave: (changes: Partial<R>) => Promise<unknown>;
    /** View-only (support sessions, roles without edit rights). */
    readOnly?: boolean;
  },
) {
  const ctx = useContext(EditContext);
  const id = useRef(`rec${++nextId}`).current;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<R>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const optKeys = opts.keys;
  const keys = useMemo(() => optKeys ?? (['id'] as (keyof R)[]), [optKeys]);

  const changed = useMemo(() => {
    if (!row) return {} as Partial<R>;
    const out: Partial<R> = {};
    for (const k of Object.keys(draft) as (keyof R)[]) {
      const a = draft[k] ?? null;
      const b = row[k] ?? null;
      if (a !== b) out[k] = draft[k];
    }
    return out;
  }, [draft, row]);
  const dirty = Object.keys(changed).length > 0;

  const discard = useCallback(() => {
    setDraft({});
    setError(null);
    setEditing(false);
  }, []);
  const save = useCallback(async () => {
    if (!row) return false;
    if (!dirty) {
      discard();
      return true;
    }
    setSaving(true);
    setError(null);
    try {
      const withKeys = { ...changed } as Partial<R>;
      keys.forEach((k) => (withKeys[k] = row[k]));
      await opts.onSave(withKeys);
      setDraft({});
      setEditing(false);
      return true;
    } catch (e) {
      setError((e as DataError).message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [row, dirty, changed, keys, opts, discard]);

  // Tell the shell (EditBar reminder, leave guard) while editing.
  const optsLabel = opts.label;
  useEffect(() => {
    if (!ctx) return;
    ctx.register(
      id,
      editing ? { changes: dirty ? [optsLabel] : [], saving, error, save, discard } : null,
    );
  }, [ctx?.register, id, editing, dirty, optsLabel, saving, error, save, discard]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => ctx?.register(id, null), []); // eslint-disable-line react-hooks/exhaustive-deps

  /** The value to show: the draft while editing, else the saved row. */
  const value = <K extends keyof R>(k: K): R[K] | undefined =>
    k in draft ? (draft[k] as R[K]) : row?.[k];
  const set = <K extends keyof R>(k: K, v: R[K]) => setDraft((d) => ({ ...d, [k]: v }));
  return {
    editing,
    readOnly: !editing,
    start: () => {
      if (opts.readOnly) return;
      setDraft({});
      setError(null);
      setEditing(true);
    },
    canEdit: !opts.readOnly && !!row,
    value,
    set,
    dirty,
    saving,
    error,
    save,
    discard,
  };
}
export type RecordEdit<R extends object> = ReturnType<typeof useRecordEdit<R>>;

/**
 * A record on a card: Edit (top right) → Cancel / Save in place; while editing, Delete at the
 * bottom (always confirmed). Neon's error text shows on the card with Try again.
 */
export function RecordCard<R extends object>({
  title,
  edit,
  children,
  onDelete,
  deleteLabel,
  actions,
}: {
  title: ReactNode;
  edit: RecordEdit<R>;
  children: ReactNode;
  /** Deletes the record; throw (reject) to show Neon's refusal. Omit to offer no Delete. */
  onDelete?: () => Promise<unknown>;
  /** "Delete Tipper 14" */
  deleteLabel?: string;
  /** Extra actions beside Edit (button actions that save at once). */
  actions?: ReactNode;
}) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  return (
    <Card
      title={title}
      actions={
        <Stack gap={8}>
          {!edit.editing && actions}
          {edit.editing ? (
            <>
              <Button onClick={edit.discard}>{edit.dirty ? 'Cancel' : 'Done'}</Button>
              {edit.dirty && (
                <Button variant="primary" disabled={edit.saving} onClick={() => void edit.save()}>
                  {edit.saving ? 'Saving…' : edit.error ? 'Try again' : 'Save'}
                </Button>
              )}
            </>
          ) : (
            edit.canEdit && (
              <Button icon="edit" onClick={edit.start}>
                Edit
              </Button>
            )
          )}
        </Stack>
      }
    >
      {children}
      {edit.error && (
        <Note tone="red" role="alert">
          <b>Not saved.</b> {edit.error}
        </Note>
      )}
      {edit.editing && onDelete && (
        <div className="ak-recdel">
          <LinkButtonDanger onClick={() => (setDeleteError(null), setConfirm(true))}>
            {deleteLabel ?? 'Delete'}
          </LinkButtonDanger>
          <small className="ui-muted">
            Asks to confirm. You can't delete something other records still use.
          </small>
        </div>
      )}
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`${deleteLabel ?? 'Delete'}?`}
        maxWidth={440}
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>{deleteError ? 'Close' : 'Cancel'}</Button>
            {!deleteError && (
              <Button
                variant="danger"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await onDelete!();
                    setConfirm(false);
                    edit.discard();
                  } catch (e) {
                    setDeleteError((e as Error).message);
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            )}
          </>
        }
      >
        {deleteError ? (
          <Note>
            <b>Can't delete.</b> {deleteError}
          </Note>
        ) : (
          <p className="ui-muted" style={{ margin: 0 }}>
            This removes it from the Neon database for everyone. It can't be undone.
          </p>
        )}
      </Modal>
    </Card>
  );
}
