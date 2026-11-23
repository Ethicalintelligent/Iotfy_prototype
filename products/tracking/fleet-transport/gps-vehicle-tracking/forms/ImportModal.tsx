// "Import …" (bulk upload) of the approved design: download the template, choose a CSV file, see
// the rows and what is wrong per row, then Import saves all rows in ONE transaction (all or
// nothing). Nothing is saved while any row has a problem.
import { useState } from 'react';
import { Button, FileField, Modal, Note, Stack, Table, useToast } from '@iotify/ui';
import { useSaveBatch, type Batch } from '@iotify/data';
import { csvLine, csvRecords } from './csv';

export interface ImportCheck {
  /** One message per problem, e.g. "Row 3: Plate Number is empty." Nothing is saved while any. */
  problems: string[];
  batch: Batch;
  /** What Import will do, e.g. "2 new vehicles, 3 updated". */
  summary: string;
}

const PREVIEW = 8;

export function ImportModal({
  noun,
  headers,
  required = [],
  note,
  check,
  onClose,
}: {
  /** Plural, e.g. "vehicles". */
  noun: string;
  /** The columns of the template (the grid's visible columns). */
  headers: string[];
  /** Columns the file must have. */
  required?: string[];
  /** How rows are matched, e.g. "Rows with a known Plate Number update that vehicle." */
  note?: string;
  check: (rows: Record<string, string>[]) => ImportCheck;
  onClose: () => void;
}) {
  const save = useSaveBatch();
  const toast = useToast();
  const [file, setFile] = useState<{
    name: string;
    rows: Record<string, string>[];
    unknown: string[];
    missing: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const template = () => {
    const url = URL.createObjectURL(
      new Blob([String.fromCharCode(0xfeff) + csvLine(headers) + '\n'], {
        type: 'text/csv;charset=utf-8',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${noun}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const choose = async (files: File[]) => {
    setError(null);
    const f = files[0];
    if (!f) return setFile(null);
    try {
      const parsed = csvRecords(await f.text(), headers);
      setFile({ name: f.name, ...parsed });
    } catch (e) {
      setFile(null);
      setError(`Couldn't read ${f.name}: ${(e as Error).message}`);
    }
  };

  const missingRequired = file ? required.filter((h) => file.missing.includes(h)) : [];
  const result = file && file.rows.length && !missingRequired.length ? check(file.rows) : null;
  const shownCols = headers.filter((h) => file && !file.missing.includes(h));

  const run = async () => {
    if (!result) return;
    setError(null);
    try {
      await save.mutateAsync(result.batch);
      toast(`Imported: ${result.summary}.`);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Import ${noun}`}
      maxWidth={file ? 920 : 720}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!result || result.problems.length > 0 || save.isPending}
            onClick={run}
          >
            {save.isPending ? 'Importing…' : 'Import'}
          </Button>
        </>
      }
    >
      <Stack dir="col" gap={12} align="stretch">
        <p style={{ margin: 0 }}>
          Fill the template in Excel, save it as CSV, then choose the file. Every row is checked
          first; nothing is saved until you press Import, and then all rows are saved or none.
          {note ? ` ${note}` : ''}
        </p>
        <Stack gap={10} wrap align="flex-end">
          <Button icon="download" onClick={template}>
            Download template
          </Button>
          <div style={{ flex: 1, minWidth: 240 }}>
            <FileField label="CSV file" accept=".csv,text/csv" onFiles={choose} />
          </div>
        </Stack>
        {file && (
          <>
            <span className="ui-muted" style={{ fontSize: 12 }}>
              {file.name} · {file.rows.length} row{file.rows.length === 1 ? '' : 's'}
              {file.unknown.length ? ` · ignored columns: ${file.unknown.join(', ')}` : ''}
            </span>
            {missingRequired.length > 0 && (
              <Note tone="red" role="alert">
                The file has no {missingRequired.join(', ')} column. Use the template.
              </Note>
            )}
            {!file.rows.length && <Note tone="red">The file has no rows under the headers.</Note>}
            {file.rows.length > 0 && (
              <Table<Record<string, string> & { __n: string }>
                bare
                label={`Rows in ${file.name}`}
                rows={file.rows.slice(0, PREVIEW).map((r, i) => ({ ...r, __n: String(i + 2) }))}
                rowKey={(r) => r.__n}
                columns={[
                  { header: 'Row', cell: (r) => r.__n },
                  ...shownCols.map((h) => ({
                    header: h,
                    cell: (r: Record<string, string>) => r[h] || '—',
                  })),
                ]}
              />
            )}
            {file.rows.length > PREVIEW && (
              <span className="ui-muted" style={{ fontSize: 12 }}>
                and {file.rows.length - PREVIEW} more row
                {file.rows.length - PREVIEW === 1 ? '' : 's'}
              </span>
            )}
            {result && result.problems.length > 0 && (
              <Note tone="red" role="alert">
                <b>Fix these rows and choose the file again (nothing was saved):</b>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  {result.problems.slice(0, 20).map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                  {result.problems.length > 20 && <li>… and {result.problems.length - 20} more</li>}
                </ul>
              </Note>
            )}
            {result && !result.problems.length && (
              <Note tone="green">Ready: {result.summary}.</Note>
            )}
          </>
        )}
        {error && (
          <Note tone="red" role="alert">
            {error}
          </Note>
        )}
      </Stack>
    </Modal>
  );
}
