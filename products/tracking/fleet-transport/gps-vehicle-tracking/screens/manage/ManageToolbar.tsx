// The toolbar row of a Manage module (approved design): picker, search, Freeze Columns, Columns,
// download, bulk upload, and the green Add button on the right. Every part is optional.
import type { ReactNode } from 'react';
import { Button, ColumnChooser, SearchInput, Stack, ToolButton } from '@iotify/ui';

export interface ManageToolbarProps {
  picker: ReactNode;
  search?: string;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  freeze?: boolean;
  onFreeze?: (v: boolean) => void;
  /** Columns for the "Columns 8/10" chooser. */
  columns?: { key: string; header: string }[];
  hidden?: string[];
  onHidden?: (keys: string[]) => void;
  onDownload?: () => void;
  onUpload?: () => void;
  /** Extra buttons before Add. */
  extra?: ReactNode;
  addLabel?: string;
  onAdd?: () => void;
  /** No Add (view-only). */
  readOnly?: boolean;
}

export function ManageToolbar(p: ManageToolbarProps) {
  return (
    <Stack justify="space-between" gap={10}>
      <Stack gap={10}>
        {p.picker}
        {p.onSearch && (
          <div style={{ width: 360, maxWidth: '100%' }}>
            <SearchInput
              value={p.search ?? ''}
              onChange={p.onSearch}
              placeholder={p.searchPlaceholder ?? 'Search…'}
            />
          </div>
        )}
      </Stack>
      <Stack gap={8}>
        {p.onFreeze && (
          <ToolButton icon="side" active={p.freeze} onClick={() => p.onFreeze!(!p.freeze)}>
            Freeze Columns
          </ToolButton>
        )}
        {p.columns && p.onHidden && (
          <ColumnChooser columns={p.columns} hidden={p.hidden ?? []} onChange={p.onHidden} />
        )}
        {p.onDownload && (
          <ToolButton icon="download" label="Download as CSV" onClick={p.onDownload} />
        )}
        {p.onUpload && !p.readOnly && (
          <ToolButton icon="upload" label="Bulk upload" onClick={p.onUpload} />
        )}
        {p.extra}
        {p.onAdd && !p.readOnly && (
          <Button variant="primary" icon="plus" onClick={p.onAdd}>
            {p.addLabel ?? 'Add'}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
