# @iotify/data

The only way screens read and write data. Screens never write SQL or call a database driver.

```
screens → hooks (useAssets, useSaveBatch…) → repository (builds SQL) → connection
                                                                     ├─ neon-dev   Vite endpoint /__sql, DATABASE_URL in .env.local
                                                                     ├─ claude-mcp window.claude.use('mcp') on claude.ai
                                                                     └─ api        future Java backend (placeholder)
```

## Reading

```tsx
import { useAssets, useRecord, useTable } from '@iotify/data';

const { data: assets, isLoading, error } = useAssets({ company_id: companyId }); // one hook per core table
const { data: site } = useRecord('sites', siteId); // one row, null if not found
const { data } = useTable('nodes', { type: 'Product', status: ['Active', 'Deferred'] }); // list = any of
```

Data is re-read whenever a screen opens, when the user comes back to the tab, and after every save, so other roles' changes show up. Nothing is kept in the browser.

## Saving (editing model)

- **Save in Edit mode:** `useSaveBatch()` writes every change in **one transaction** (all or nothing).
- **Button actions** (Add, Send, Accept): `useSaveRecord()` saves at once.
- **Delete after confirm:** `useDeleteRecord()`. Neon refuses if other records still use it.
- Only the columns you pass are written; `updated_at` is set when something changed.
- On failure, `error.message` is **Neon's exact text** (plus `error.detail`, `error.constraint`). Show it with Try again and Cancel (`EditBar` in `@iotify/ui`).

```tsx
const save = useSaveBatch();
save.mutate(
  { upserts: [{ table: 'assets', rows: [{ id: 'A001', name: 'Tipper 15' }] }], deletes: [{ table: 'zones', keys: [{ id: 'Z9' }] }] },
  { onSuccess: () => setEditing(false) },
);
```

## Types

`pnpm db:types` reads the `core` schema from Neon and writes `src/schema.gen.ts` (row types, table list, allowed values from CHECK constraints such as `VALUES.nodes.status`) and `src/hooks.gen.ts`. Names are exactly the database's (`snake_case`). Run it again after a core migration.

## Rules built in

- Every statement runs as `iotify_prototyper` (`SET LOCAL ROLE`, docs/CORE_RULES.md rule 1), so core structure can't be changed.
- Table and column names are checked against the generated schema; values are always parameters.
- The connection string stays in `.env.local` and on the dev server; it never reaches the browser.
- The `/__sql` endpoint exists only in the dev server and only answers this app's own pages.

Check it works: http://localhost:5175/debug/data lists the row count of every core table.
