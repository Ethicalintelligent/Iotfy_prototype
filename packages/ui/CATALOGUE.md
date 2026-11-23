# @iotify/ui catalogue

**Check this list before building any UI.** If the component exists, use it. If it's missing or needs a new variant, add it here in `packages/ui` (or in the EIT UI library once it's linked), add an entry below, then use it. Never build buttons, inputs, tables, cards, chips, modals and so on inside a product folder.

- Import everything from `@iotify/ui`: `import { Button, Card } from '@iotify/ui';`
- See every component live at **`/ui`** in customer-apps (http://localhost:5175/ui).
- Colours, type, spacing and radii are CSS variables in `src/styles/tokens.css` (`var(--ink)`, `var(--space-4)`, `var(--radius-lg)`…). Products never hard-code colours.
- **Source** says where a component comes from: `iotify` (this package) or `eit` (the EIT UI library, once linked: see `src/eit.ts`).

## Basics

| Component | Purpose | Key props | Example | Source |
|---|---|---|---|---|
| `Icon` | Stroke icon from the IoTIFY set (47 icons, see `ICONS`) | `name`, `size` (18) | `<Icon name="assets" />` | iotify |
| `Stack` | Flex row or column with a gap. The only layout helper products need | `dir` (`row`/`col`), `gap` (10), `wrap`, `align`, `justify` | `<Stack justify="space-between">…</Stack>` | iotify |
| `Button` | Every text button | `variant` (`default`/`primary`/`danger`/`ghost`), `size` (`md`/`sm`), `icon` | `<Button variant="primary" icon="plus">Add asset</Button>` | iotify |
| `LinkButtonDanger` | Red text "Delete" inside a record in Edit mode | button props | `<LinkButtonDanger onClick={…}>Delete this asset</LinkButtonDanger>` | iotify |
| `IconButton` | Icon-only button (header tools) with optional count badge | `icon`, `label` (required), `badge`, `badgeTone`, `active`, `outlined` | `<IconButton icon="bell" label="Notifications" badge={3} />` | iotify |
| `Card` | White rounded panel; optional title line with actions on the right | `title`, `actions`, `padded` (true) | `<Card title="Recent alerts" actions={<Button size="sm">View all</Button>}>…</Card>` | iotify |
| `Chip` | Small pill label | `tone` (`neutral`/`blue`/`green`/`amber`/`red`/`warn`/`bad`/`info`) | `<Chip tone="blue">Selected</Chip>` | iotify |
| `StatusChip` | Chip coloured from a status word (Active → green, Draft → amber, Ended → red) | `status` | `<StatusChip status={row.status} />` | iotify |
| `statusTone()` | The colour rule behind `StatusChip` | `(status) → ChipTone` | `statusTone('Trial') // 'amber'` | iotify |
| `YesNo` | ✓ Yes / ✗ No in green or red | `value`, `yes`, `no` | `<YesNo value={a.tracked} />` | iotify |
| `Avatar` | Initials in a coloured circle, optional status dot | `name`, `tone` (`violet`/`blue`/`green`/`amber`), `size` (30), `status` (CSS colour) | `<Avatar name="Maya Rahman" status="var(--success)" />` | iotify |
| `Dot` | Small coloured dot for lists | `tone` (`red`/`amber`/`blue`/`green`/`grey`) | `<Dot tone="red" />` | iotify |
| `Note` | Tinted message box (red for errors) | `tone` (`amber`/`green`/`grey`/`red`) | `<Note>Can't delete: still used by …</Note>` | iotify |
| `Tabs` | Segmented tabs; the active one is green | `tabs` `[{key,label}]`, `value`, `onChange`, `label` | `<Tabs tabs={…} value={tab} onChange={setTab} />` | iotify |
| `EmptyState` | Centered "nothing here" message, optional icon and action | `title`, `icon`, `action`, children | `<EmptyState title="No assets yet">Add your first vehicle.</EmptyState>` | iotify |
| `Loading` | Spinner with text | children (`Loading…`) | `<Loading>Loading from Neon…</Loading>` | iotify |

## Fields

All fields follow the editing model: pass `readOnly` until the user presses **Edit**. Read-only fields look like plain text. Each one takes `label`, `hint`, `readOnly`, `disabled`, `required` (shows a red * after the label), `action` (a small link beside the label, e.g. `<FieldAction>`), `name`.

| Component | Purpose | Key props | Example | Source |
|---|---|---|---|---|
| `TextField` | Text, number, email, phone, URL | `value`, `onChange(string)`, `type`, `placeholder` | `<TextField label="Name" value={f.name} readOnly={!editing} onChange={…} />` | iotify |
| `SelectField` | Drop-down | `value`, `onChange(string)`, `options` `[{value,label}]`, `placeholder` (empty choice, e.g. `—`) | `<SelectField label="Site" options={sites} value={f.site_id} … />` | iotify |
| `CheckboxField` | Checkbox with its label on the right | `checked`, `onChange(boolean)` | `<CheckboxField label="Track on map" checked={f.tracked} … />` | iotify |
| `DateField` | Date (ISO `yyyy-mm-dd`) | `value`, `onChange(string)`, `min`, `max` | `<DateField label="Start" value={f.start_date} … />` | iotify |
| `ColorField` | Colour picker with the hex value beside it | `value` (`#rrggbb`), `onChange(string)` | `<ColorField label="Brand colour" value={d.brand_color} … />` | iotify |
| `FileField` | File picker; shows the stored file name when read-only | `onFiles(File[])`, `accept`, `multiple`, `current` | `<FileField label="Logo" accept="image/*" current={d.brand_logo} … />` | iotify |
| `SearchInput` | Search box beside a list (no label line) | `value`, `onChange`, `placeholder` | `<SearchInput value={q} onChange={setQ} placeholder="Search assets" />` | iotify |
| `FieldGrid` | Two-column grid of fields | children | `<FieldGrid><TextField …/><DateField …/></FieldGrid>` | iotify |
| `Field` | Label + hint wrapper for a custom control | `label`, `hint`, `htmlFor`, `required`, `action` | `<Field label="Area">{custom}</Field>` | iotify |
| `FieldAction` | Green "+ Add" link beside a field label (adds a choice; saves at once) | `onClick`, children (`Add`) | `<SelectField label="Make" action={<FieldAction onClick={add} />} … />` | iotify |
| `RadioGroupField` | A few choices side by side (Active / Inactive) | `label`, `value`, `onChange`, `options`, `required`, `readOnly` | `<RadioGroupField label="Status" options={opts} value={s} onChange={setS} />` | iotify |

## Data display

| Component | Purpose | Key props | Example | Source |
|---|---|---|---|---|
| `Table` | Data table: pill header row, clickable rows (Enter works too), empty message | `columns` `[{header, cell, align, width}]` (`cell` is a field name or a function), `rows`, `onRowClick`, `rowKey`, `empty`, `label`, `bare` (no card) | `<Table rows={assets} columns={[{header:'Name', cell:'name'}, {header:'Status', cell:r => <StatusChip status={r.status}/>}]} onRowClick={open} />` | iotify |
| `KpiTile` | Dashboard number: label, big value, coloured sub line | `label`, `value`, `sub`, `tone` (`ok`/`warn`) | `<KpiTile label="Open alerts" value="7" sub="2 overspeed" tone="warn" />` | iotify |
| `KpiRow` | Responsive row of KPI tiles | children | `<KpiRow>{4 × KpiTile}</KpiRow>` | iotify |
| `AssetMap` | Live map or floor plan with a pulsing dot per asset (amber = attention); reduced motion respected | `points` `[{id,label,warn}]`, `floor`, `zones` `[{name,restricted}]`, `label` | `<AssetMap points={pts} floor zones={[{name:"Lobby"}]} />` | iotify |
| `GeofenceMap` | Geofence list (Circle / Freeform, tick to select) beside a schematic map; can pick a point for a new circle | `fences` `[{id,name,shape,lat,lng,radiusM,points}]`, `selected`, `onToggle`, `onPick`, `picked`, `readOnly` | `<GeofenceMap fences={f} selected={ids} onToggle={toggle} />` | iotify |
| `BarChart` | Small column chart (7-day trend); the highlighted bar is strong green | `values`, `labels`, `label` (accessible), `format`, `highlight` (last) | `<BarChart values={v} labels={days} label="Distance, last 7 days" />` | iotify |

## Overlays

| Component | Purpose | Key props | Example | Source |
|---|---|---|---|---|
| `Modal` | Dialog with title, optional ID chip, footer (Cancel / Save right, Delete left). Esc and a click outside close it; focuses the first field | `open`, `onClose`, `title`, `badge`, `footer`, `footerStart`, `maxWidth` | `<Modal open={o} onClose={close} title="New · Asset" footer={…}>…</Modal>` | iotify |
| `Drawer` | Right-hand panel from the approved GPS Platform design (Add Vehicle / Add Device): icon-tile header, step links that scroll to sections, footer (Reset / Add). Esc and a click outside close it | `open`, `onClose`, `title`, `subtitle`, `icon` (`plus`), `steps` `[{key,label}]`, `footer`, `notice`, `width` (710) | `<Drawer open title="Add Vehicle" steps={steps} footer={…}>…</Drawer>` | iotify |
| `FormSection` | White section card in a Drawer: icon + title, 3-column field grid (1 on phones); `id` links it to a Drawer step | `id`, `title`, `icon` (`info`), `cols` (3), `actions` | `<FormSection id="fuel" title="Fuel" icon="fuel">…</FormSection>` | iotify |
| `FormSubhead`, `FullRow` | A sub-heading row (with actions) / any content spanning the whole row of a FormSection | children, `actions` | `<FormSubhead actions={…}>Digital I/O</FormSubhead>` | iotify |
| `ToastProvider` / `useToast` | Short message at the bottom for 3.5 s. Wrap the app once | `useToast()(message)` | `const toast = useToast(); toast('Saved');` | iotify |
| `Popover` | Menu anchored top right (under the header tools) or beside the rail | `open`, `onClose`, `placement` (`top-right`/`rail`), `label`, `width` | `<Popover open={m==='notif'} onClose={…}>…</Popover>` | iotify |
| `PopoverHeader`, `PopoverItem`, `PopoverSection`, `PopoverSeparator` | Popover content | item: `title`, `subtitle`, `icon` or `lead`, `selected`, `danger`, `onClick` | `<PopoverItem icon="out" title="Sign out" danger />` | iotify |
| `SearchTrigger` | The wide "Search… Ctrl K" box in the header | `onClick`, `placeholder` | `<SearchTrigger onClick={() => setSearch(true)} />` | iotify |
| `SearchPalette` | Ctrl+K search dialog; arrow keys and Enter choose | `open`, `onClose`, `query`, `onQueryChange`, `results` `[{id,title,subtitle,icon,onSelect}]` | `<SearchPalette open={s} … results={r} />` | iotify |
| `useCtrlK` | Opens something on Ctrl+K / Cmd+K | `(onOpen)` | `useCtrlK(() => setSearch(true));` | iotify |
| `EditBar` | Bottom reminder bar while editing: "No changes yet" / "Unsaved changes in …" / "Not saved" + Neon's error with Try again | `changes` (names), `error`, `saving`, `onCancel`, `onSave`, `inline` | `<EditBar changes={['Assets']} error={err} onSave={save} onCancel={cancel} />` | iotify |
| `useEscape` | Runs something when Esc is pressed | `(active, onEscape)` | `useEscape(open, close);` | iotify |

## Page frame

| Component | Purpose | Key props | Example | Source |
|---|---|---|---|---|
| `PageHeader` | One thin title row (~40 px): title, ⓘ description, back link on detail pages, header tools on the right. **No page actions here**: put + Add, Edit next to the content | `title`, `description`, `back` `{label,onClick}`, `meta`, `tools` | `<PageHeader title="Assets" description="Everything you track." tools={tools} />` | iotify |
| `Rail` | Left menu: 56 px icons only, opens to 224 px on hover (no click), closes when a page is chosen; slides in on phones | `brand`, `subtitle`, `logoText` (+ `logoColor`) or `logoUrl`, `sections` `[{heading, items:[{key,label,icon,badge,badgeTone}]}]`, `active`, `onSelect`, `footer`, `mobileOpen`, `onMobileClose` | `<Rail brand="GPS Vehicle Tracking" sections={menu} active={page} onSelect={go} />` | iotify |
| `ShellFrame` | Page frame beside the Rail (room for the 56 px rail; phone top bar with menu button) | `rail`, `mobileTitle`, `onMobileMenu`, children | `<ShellFrame rail={<Rail …/>} mobileTitle="Assets">…</ShellFrame>` | iotify |
| `RailButton` | A button for the rail's `footer` | `icon`, `label`, `onClick` | `<RailButton icon="help" label="Help" onClick={…} />` | iotify |

The full AppShell (rail + header + page + leave guard) is built from these in `packages/app-kit` (Step 6).

## Sign-in and apps

| Component | Purpose | Key props | Example | Source |
|---|---|---|---|---|
| `SignInLayout` | Two-panel sign-in page: dark brand panel left; form right in a white card with an icon-tile header, as in the approved GPS Platform screens (one column on phones) | `brand`, `heading` (highlight with `<span>`), `intro`, children, `footer`, `form`, `formTitle`, `formSubtitle`, `formIcon` (`lock`) | `<SignInLayout brand={…} heading={<>IoTIFY <span>Partner Portal</span></>} form={form} />` | iotify |
| `HeroList` | Feature list on the dark panel | `items` `[{title,text}]` | `<HeroList items={[{title:"Sell", text:"Customers and quotes."}]} />` | iotify |
| `HeroChips` | Small pills on the dark panel (features under a sign-in scene) | `items` (strings), `label` | `<HeroChips label="Features" items={["Live map", "Trips"]} />` | iotify |
| `DividerText` | Line with a label in the middle | children | `<DividerText>Demo accounts</DividerText>` | iotify |
| `DemoAccountButton`, `DemoAccountGrid` | Demo account card that fills the sign-in form; names wrap to two lines | `name`, `detail`, `tone` | `<DemoAccountButton name="Company A admin" detail="Company Admin · Sample Company A" />` | iotify |
| `DemoAccountGroup`, `DemoAccountGroups` | Demo accounts grouped under their company or dealer, in a scrolling list (long lists) | group: `title` | `<DemoAccountGroups><DemoAccountGroup title="Sample Company A">{buttons}</DemoAccountGroup></DemoAccountGroups>` | iotify |
| `BrandLogo` | Logo square: EIT gradient, a white-label colour, or a logo image | `text`, `color`, `imageUrl`, `size` (38) | `<BrandLogo text="TP" color="#2B6CB0" />` | iotify |
| `AppTile`, `AppGrid` | An app on "My apps"; `compact` for a one-line tile | `name`, `kind`, `meta`, `compact`, `onClick` | `<AppTile name="HealthSafe" kind="Package · 3 products" meta="12 assets" />` | iotify |
| `EntryLinks` | Groups of links on the dark sign-in panel (every product’s own sign-in page) | `title`, `intro`, `groups` `[{heading, links:[{href,label,detail,onClick}]}]` | `<EntryLinks title="Product sign-in pages" groups={g} />` | iotify |
| `SupportBar` | Amber banner during a support session (view-only) | children, `action` | `<SupportBar action={<Button size="sm">End session</Button>}>…</SupportBar>` | iotify |

## Tokens (most used)

| Token | Use |
|---|---|
| `--ink`, `--ink-soft`, `--muted` | Text: main, secondary, grey |
| `--page`, `--white`, `--sub` | Page background, cards, subtle panels |
| `--eit-green`, `--eit-teal`, `--eit-mint`, `--grad-brand` | Brand colours and the primary gradient |
| `--success`, `--warning`, `--danger`, `--info` | Status colours |
| `--divider`, `--hairline`, `--border` | Lines |
| `--space-1` … `--space-8` | 4, 6, 8, 10, 12, 16, 20, 24 px |
| `--radius-sm` … `--radius-xl`, `--radius-pill` | 8, 10, 14, 16 px, pill |
| `--text-xs` … `--text-kpi` | 10, 11, 12, 14, 16, 24 px |
| `--rail-width`, `--rail-width-open` | 56 px, 224 px |
