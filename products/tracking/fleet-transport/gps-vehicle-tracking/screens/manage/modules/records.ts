// IT-0038. Child rows the Manage forms save next to a record, in the same transaction:
// files (core.documents) and notification recipients (core.notification_recipients).
// Child rows get ids that follow from their place, so a save upserts the current rows and
// deletes the ones no longer there (the batch runs upserts before deletes).
import type { Batch, DocumentsRow, NotificationRecipientsRow } from '@iotify/data';
import type { FileRef } from '../ui';

type Rec = Record<string, unknown>;

/* ------------------------------------------------------------------ documents */

/** The saved files of a record, for the form. */
export function docsOf(
  all: DocumentsRow[] | undefined,
  ownerTable: string,
  ownerId: string,
  kind: string,
): FileRef[] {
  return (all ?? [])
    .filter((d) => d.owner_table === ownerTable && d.owner_id === ownerId && d.kind === kind)
    .sort(
      (a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.id.localeCompare(b.id),
    )
    .map((d) => ({
      id: d.id,
      name: d.file_name,
      size: d.size_bytes,
      type: d.mime_type ?? undefined,
    }));
}

/** Adds new files and removes dropped ones of one record and kind. */
export function saveDocs(
  batch: Batch,
  all: DocumentsRow[] | undefined,
  o: { companyId: string; ownerTable: string; ownerId: string; kind: string; files: FileRef[] },
) {
  const keep = new Set(o.files.filter((f) => f.id).map((f) => f.id!));
  const rows: Rec[] = o.files
    .filter((f) => !f.id && f.content)
    .map((f) => ({
      id: `DOC-${crypto.randomUUID()}`,
      company_id: o.companyId,
      owner_table: o.ownerTable,
      owner_id: o.ownerId,
      kind: o.kind,
      file_name: f.name,
      mime_type: f.type || null,
      size_bytes: f.size ?? 0,
      content: f.content,
    }));
  if (rows.length) (batch.upserts ??= []).push({ table: 'documents', rows });
  const gone = (all ?? []).filter(
    (d) =>
      d.owner_table === o.ownerTable &&
      d.owner_id === o.ownerId &&
      d.kind === o.kind &&
      !keep.has(d.id),
  );
  if (gone.length)
    (batch.deletes ??= []).push({ table: 'documents', keys: gone.map((d) => ({ id: d.id })) });
}

/** Deletes every file of a record (the record is being deleted). */
export function dropDocs(
  batch: Batch,
  all: DocumentsRow[] | undefined,
  ownerTable: string,
  ownerId: string,
) {
  const gone = (all ?? []).filter((d) => d.owner_table === ownerTable && d.owner_id === ownerId);
  if (gone.length)
    (batch.deletes ??= []).push({ table: 'documents', keys: gone.map((d) => ({ id: d.id })) });
}

/* ------------------------------------------------------------------ recipients */

export interface RecipientRow {
  level: number;
  channel: 'push' | 'sms' | 'email';
  user_id?: string | null;
  name?: string | null;
  address?: string | null;
}

/** The recipient rows of one rule, in their saved order. */
export function recipientsOf(
  all: NotificationRecipientsRow[] | undefined,
  sourceTable: string,
  sourceId: string,
) {
  return (all ?? [])
    .filter((r) => r.source_table === sourceTable && r.source_id === sourceId)
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || (a.sort ?? 0) - (b.sort ?? 0));
}

/** Replaces the recipients of one rule. */
export function saveRecipients(
  batch: Batch,
  all: NotificationRecipientsRow[] | undefined,
  o: { companyId: string; sourceTable: string; sourceId: string; rows: RecipientRow[] },
) {
  const rows: Rec[] = o.rows.map((r, i) => ({
    id: `NR-${o.sourceTable}|${o.sourceId}|${i}`,
    company_id: o.companyId,
    source_table: o.sourceTable,
    source_id: o.sourceId,
    level: r.level,
    user_id: r.user_id ?? null,
    name: r.name ?? null,
    channel: r.channel,
    address: r.address ?? null,
    sort: i,
  }));
  if (rows.length) (batch.upserts ??= []).push({ table: 'notification_recipients', rows });
  const keep = new Set(rows.map((r) => r.id as string));
  const gone = recipientsOf(all, o.sourceTable, o.sourceId).filter((r) => !keep.has(r.id));
  if (gone.length)
    (batch.deletes ??= []).push({
      table: 'notification_recipients',
      keys: gone.map((r) => ({ id: r.id })),
    });
}

/** Deletes every recipient of a rule (the rule is being deleted). */
export function dropRecipients(
  batch: Batch,
  all: NotificationRecipientsRow[] | undefined,
  sourceTable: string,
  sourceId: string,
) {
  const gone = recipientsOf(all, sourceTable, sourceId);
  if (gone.length)
    (batch.deletes ??= []).push({
      table: 'notification_recipients',
      keys: gone.map((r) => ({ id: r.id })),
    });
}
