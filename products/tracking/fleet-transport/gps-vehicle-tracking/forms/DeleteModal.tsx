// "Delete this …?" confirmation of the approved design: a button action that deletes at once after
// the confirmation, in one transaction. When Neon refuses (other records still use it), its exact
// text is shown.
import { useState, type ReactNode } from 'react';
import { Button, Modal, Note } from '@iotify/ui';
import { useSaveBatch, type Batch } from '@iotify/data';

export function DeleteModal({
  title,
  children,
  batch,
  onClose,
  onDeleted,
}: {
  /** e.g. "Delete this vehicle?" */
  title: string;
  /** What will be removed. */
  children: ReactNode;
  /** The rows to delete (and anything to clear first). */
  batch: Batch;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const save = useSaveBatch();
  const [error, setError] = useState<string | null>(null);
  const del = async () => {
    try {
      await save.mutateAsync(batch);
      onDeleted?.();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      maxWidth={460}
      footer={
        <>
          <Button onClick={onClose}>{error ? 'Close' : 'Cancel'}</Button>
          {!error && (
            <Button variant="danger" disabled={save.isPending} onClick={del}>
              {save.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          )}
        </>
      }
    >
      {error ? (
        <Note tone="red" role="alert">
          <b>Can't delete.</b> {error}
        </Note>
      ) : (
        <p className="ui-muted" style={{ margin: 0 }}>
          {children} This action cannot be undone.
        </p>
      )}
    </Modal>
  );
}
