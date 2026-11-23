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

## Dashboards and maps (approved GPS Vehicle Tracking design, Desktop/vs)

Colours come from a **hue** (`slate`, `green`, `red`, `blue`, `black`, `orange`, `teal`, `grey`, `purple`, `amber`: the `--hue-*` tokens). Products pass a hue name, never a colour.

| Component | Purpose | Key props | Example | Source |
|---|---|---|---|---|
| `IconTile` | Rounded square with an icon: panel headings, tiles, list leads | `icon`, `hue`, `size` (`sm`/`md`/`lg`), `variant` (`soft`/`solid`) | `<IconTile icon="vehicles" hue="green" />` | iotify |
| `Card` (icon heading) | `Card` also takes an icon tile and a grey subtitle line for dashboard panels | `icon`, `iconHue`, `subtitle` | `<Card icon="navigate" title="Real-Time Vehicle Tracking" subtitle="Track vehicle movements">…</Card>` | iotify |
| `StatusTile`, `StatusTileRow` | A count with a solid icon tile ("Running 10 · 41.7% of total"); a row of them that wraps. A tile with `onClick` is a filter button | `label`, `value`, `sub`, `icon`, `hue`, `active`, `onClick`, `compact`; row: `min` (150) | `<StatusTile label="Running" value={10} sub="41.7% of total" icon="play" hue="green" />` | iotify |
| `AutoGrid` | Tiles side by side that wrap, each at least `min` px | `min` (150), `gap` (10) | `<AutoGrid min={120}>{tiles}</AutoGrid>` | iotify |
| `PanelGrid`, `PanelWide` | Dashboard panels in two columns (one below 1100 px); `PanelWide` spans both | children | `<PanelGrid><Card…/><Card…/><PanelWide><Card…/></PanelWide></PanelGrid>` | iotify |
| `TickerStrip` | Slowly scrolling strip of counts with a lead pill ("Today Alerts"); pauses on hover; still for reduced motion | `lead`, `items` `[{key,label,count,icon,hue}]`, `label` | `<TickerStrip lead="Today Alerts" items={items} label="Today's alerts" />` | iotify |
| `HueChip` | Small tinted pill with a dot or icon ("● Running", "❄ AC On") | `hue`, `icon`, `solid` | `<HueChip hue="green">Running</HueChip>` | iotify |
| `BarList` | Rows of label · bar · value (zone entries, vehicles per speed range) | `rows` `[{key,label,icon,value,display,hue}]`, `max`, `label`, `labelWidth` | `<BarList label="Zone moves" rows={rows} />` | iotify |
| `MetricPill` | Wide tinted pill holding one number (summary table cells) | `hue`, children | `<MetricPill hue="blue">13</MetricPill>` | iotify |
| `Legend` | Coloured dots with labels | `items` `[{label,hue}]` | `<Legend items={[{label:'Running',hue:'green'}]} />` | iotify |
| `ActivityTimeline` | One bar per row across the day (00:00–24:00), coloured by status | `rows` `[{key,title,subtitle,lead,segments:[{from,to,hue,title}]}]`, `label`, `leadHeader`, `ticks` (hours) | `<ActivityTimeline label="Activity" rows={rows} ticks={[0,3,6,9,12,15,18,21,24]} />` | iotify |
| `PillSelect` | Compact drop-down shaped like a pill button ("📅 Yesterday ▾") | `value`, `onChange`, `options` `[{value,label}]`, `icon`, `label` | `<PillSelect icon="calendar" label="Period" value={p} onChange={setP} options={opts} />` | iotify |
| `PagedRow` | Cards side by side, a page at a time, with arrows and "Showing 1–5 of 10" | `items` (nodes), `perPage` (5), `label` | `<PagedRow label="Top 10" items={cards} />` | iotify |
| `RankBadge` | Gold, silver, bronze medal for 1–3; numbered circle after | `rank`, `size` (30) | `<RankBadge rank={1} />` | iotify |
| `RankCard` | Ranked card: medal, big value, picture, plate and model (top-10 lists) | `rank`, `value`, `unit`, `caption`, `picture`, `title`, `subtitle`, `footer`, `hue` | `<RankCard rank={1} value="334" unit="km" title="KSA 1189" picture={<VehiclePhoto category="Truck" />} />` | iotify |
| `ShareTile` | Share of a whole: icon, label, chip ("97 hrs"), big percent and bar | `label`, `icon`, `hue`, `chip`, `percent` | `<ShareTile label="Running" icon="play" hue="green" chip="97h" percent={59.6} />` | iotify |
| `CountTile` | Tinted tile: label, big number, unit ("24–48 hrs · 3 · Vehicles") | `label`, `value`, `unit`, `icon`, `hue` | `<CountTile label="24–48 hrs" value={3} unit="Vehicles" hue="red" />` | iotify |
| `MiniStat` | Icon, number with unit, small label ("29,499 km · Avg. Odometer") | `icon`, `value`, `unit`, `label`, `hue` | `<MiniStat icon="gauge" value="29,499" unit="km" label="Avg. Odometer" />` | iotify |
| `StreetMap` | Real street map (Leaflet + OpenStreetMap; needs internet): markers by hue, nearby ones grouped into a count bubble, plate labels, geofences (circle / polygon), a route with stops, zoom / fit / layers tools. Leaflet loads only when a map is shown | `label`, `markers` `[{id,lat,lng,label,detail,hue,icon,pulse}]`, `fences` `[{id,name,shape,lat,lng,radiusM,points,hue}]`, `route` `{points,stops}`, `cluster` (true), `labels`, `selected`, `onSelect`, `fitKey`, `wheelZoom`, `height`, `overlay`, `footer`, `tools` | `<StreetMap label="Live map" markers={m} fences={f} height={320} />` | iotify |
| `MapToolButton` | A round button for a StreetMap's `tools` column | `icon`, `label`, `onClick`, `active` | `<MapToolButton icon="expand" label="Full screen" onClick={…} />` | iotify |
| `StreetMap` `onMapClick` | A click on the map itself (not a marker) gives its position: place a geofence's centre or corners (crosshair cursor) | `onMapClick(lat, lng)` | `<StreetMap label="Draw zone" onMapClick={(lat, lng) => setCentre([lat, lng])} />` | iotify |
| `StreetMap` `routes` | Several routes at once, each line in its own hue (replaying vehicles side by side); `route` still draws one blue route | `routes` `[{points,stops,hue}]` | `<StreetMap label="History" routes={[{points, hue: 'orange'}]} markers={now} />` | iotify |

## Data grids, menus and controls (approved GPS Vehicle Tracking design: Manage, Reports, Alerts)

| Component | Purpose | Key props | Example | Source |
|---|---|---|---|---|
| `DataGrid` | The design's grid: mint header with a ⋮ menu per column (sort, group by), a filter box under each header, "Drag a column header here to group rows" bar, row checkboxes, sticky actions column, frozen first column, paging ("Page 1 of 3 · 24 total", rows per page, First/Back/Next/Last), row tint by hue | `label`, `rows`, `columns` `[{key,header,value,cell,width,align,filter}]`, `rowKey`, `search`, `hidden`, `freeze`, `selected`, `onSelectedChange`, `actions`, `onRowClick`, `current`, `rowHue`, `pageSize` (10), `empty`, `noGrouping` | `<DataGrid label="Vehicles" rows={vs} rowKey={(v) => v.id} columns={cols} actions={(v) => …} />` | iotify |
| `ColumnChooser` | The "Columns 8/10" button: tick which grid columns show | `columns` `[{key,header}]`, `hidden`, `onChange` | `<ColumnChooser columns={cols} hidden={hidden} onChange={setHidden} />` | iotify |
| `ToolButton` | Plain toolbar button with an icon (Freeze Columns, download); `active` for toggles; icon-only with `label` | `icon`, `children`, `onClick`, `active`, `label` | `<ToolButton icon="download" label="Download as CSV" onClick={…} />` | iotify |
| `downloadCsv()` | Saves rows as a CSV file | `(filename, columns [{header,value}], rows)` | `downloadCsv('vehicles', cols, rows)` | iotify |
| `Dropdown`, `DropdownItem` | A menu panel anchored under the element that opened it (Esc / click outside closes) | `anchor`, `open`, `onClose`, `align`, `width`, `label`; item: `icon`, `selected`, `danger`, `onClick` | `<Dropdown anchor={el} open={o} onClose={close}><DropdownItem onClick={…}>Sort</DropdownItem></Dropdown>` | iotify |
| `MenuSelect` | The design's labelled picker ("Manage Module ▾ Vehicle", "Select Report ▾") with sections, icons and a search box for long lists | `label`, `value`, `options` `[{value,label,icon,section,disabledReason}]`, `onChange`, `searchPlaceholder`, `width` | `<MenuSelect label="Manage Module" value={m} onChange={setM} options={modules} />` | iotify |
| `Switch` | On/off toggle, optionally writing "On"/"Off" beside it | `checked`, `onChange`, `label` (accessible), `showState`, `disabled` | `<Switch label="Status" checked={on} onChange={setOn} showState />` | iotify |
| `RangeField` | Slider with label and current value ("Zone Radius · 300 m") | `label`, `value`, `onChange`, `min`, `max`, `step`, `format` | `<RangeField label="Zone Radius" min={50} max={5000} value={r} onChange={setR} format={(v) => v + ' m'} />` | iotify |
| `CheckTree` | Groups of items with checkboxes and search; a group's box ticks all its items (vehicles by group) | `groups` `[{key,label,items:[{key,label,detail}]}]`, `selected`, `onChange`, `label`, `searchPlaceholder`, `max` | `<CheckTree label="Vehicles" groups={g} selected={sel} onChange={setSel} />` | iotify |
| `ListCard` | Selectable card in a side list (vehicles, geofences): lead, title, subtitle, badge, chips, actions | `lead`, `title`, `subtitle`, `badge`, `chips`, `actions`, `selected`, `onClick` | `<ListCard title="Truck 01" subtitle="Unassigned" badge={<HueChip hue="green">Running</HueChip>} />` | iotify |
| `Gauge` | Speedometer: half circle, ticks, arc to the value (red above `limit`), value in the middle | `value`, `max` (200), `unit`, `label`, `size`, `limit` | `<Gauge label="Speed" value={32} limit={80} />` | iotify |
| `MultiSelectField`, `TimeRange` | A drop-down with a checkbox per choice, listing the ticked ones ("Mon, Tue, Wed"; `allLabel` when all are ticked; opens in place, so it works in a Drawer) / a from–to pair of time boxes with an optional red remove button | multi: `label`, `value` (string[]), `onChange`, `options`, `placeholder`, `allLabel`, `required`, `readOnly`; range: `from`, `to`, `onChange(from, to)`, `label` (accessible), `onRemove`, `readOnly` | `<MultiSelectField label="Days" value={days} onChange={setDays} options={week} allLabel="Every day" />` · `<TimeRange label="Interval 1" from="08:00" to="18:00" onChange={…} onRemove={…} />` | iotify |
| `DrawerColumns`, `ColumnPanel`, `HueToggle`, `ChoiceGroup`, `ChipTabs`, `SettingRow`, `InlineInput`, `InlineSelect`, `DisclosureRow`, `KeyValueList`, `CheckList`, `StepChain` (file `SettingsForm.tsx`) | Rule and settings forms in a wide Drawer (Add Alert): columns that fill the drawer, each scrolling on its own / a full-width button filled with a hue, white tick when pressed, under a group title / pill tabs with a hue dot and a done tick or red "!" / a setting row (bold label, grey description left, control right) / bare input or drop-down with a unit after it / a row that opens ("Sunday · 1 time slot ›") / label–value summary rows / green tick or red cross checks / boxes joined by arrows ("LEVEL 0 › LEVEL 1") | columns: `template`; panel: `icon`, `title`, `subtitle`, `head`; toggle: `hue`, `icon`, `selected`, `onClick`, `disabled`, `note`; tabs: `tabs` `[{key,label,hue,mark}]`, `value`, `onChange`, `label`; row: `label`, `description`, `required`; input: `label` (accessible), `value`, `onChange`, `type`, `unit`, `invalid`; disclosure: `title`, `badge`, `summary`, `open`, `onToggle`; list: `rows` `[{label,value}]`; checks: `items` `[{label,ok}]`; chain: `steps` `[{key,kicker,text,hue}]` | `<DrawerColumns><ColumnPanel icon="bell" title="Alerts">…</ColumnPanel>…</DrawerColumns>` · `<HueToggle hue="orange" icon="gauge" selected>Overspeed</HueToggle>` · `<SettingRow label="Speed Limit" required><InlineInput label="Speed limit" type="number" unit="km/h" value={v} onChange={setV} /></SettingRow>` | iotify |
| `SideLayout`, `SearchBar`, `FilterPanel`, `FilterSection`, `ChoiceField`, `SwitchField`, `FilterChip` (file `FilterPanel.tsx`) | Grid View / Map View / Centralized Tracking filters: a side column beside the content (sticky, or a fixed height that scrolls) / a full-width search with buttons on its right / the collapsible "Vehicle Filters" panel (icon, "No filters applied", collapse to a narrow strip, Reset / Submit footer) / a collapsible section with an icon tile and a count / "Any \| On \| Off" segmented choice under a label / bold label + grey hint + switch / a pill button "● Running 10" that is a filter | layout: `side`, `sideWidth` (300), `sticky`, `sideHeight`; bar: `search`, children; panel: `title`, `subtitle`, `icon`, `collapsed`, `onCollapsedChange`, `footer`; section: `title`, `icon`, `defaultOpen`, `badge`; choice: `label`, `value`, `options`, `onChange`; switch: `label`, `hint`, `checked`, `onChange`; chip: `label`, `count`, `hue`, `active`, `onClick`, `title` | `<SideLayout sticky side={<FilterPanel title="Vehicle Filters" …><FilterSection title="Sensor" icon="signal"><ChoiceField label="Ignition" … /></FilterSection></FilterPanel>}>…</SideLayout>` · `<FilterChip label="Running" count={10} hue="green" active onClick={…} />` | iotify |
| `AssetCard`, `IndicatorStrip`, `Indicator`, `FactGrid`, `ActionIcon`, `ReadingTile`, `InfoRows`, `Pager`, `OverlayPill` (file `AssetCard.tsx`) | Grid View vehicle cards: a card with a status-coloured top edge, picture, title, badge, a grey note line and a `back` side shown over it / a tinted row of small icons (`on` tinted, `off` plain, `none` grey and struck through) with tooltips / label-over-value pairs in a tinted box / a small tinted icon button / a sensor reading with a range bar / an uppercase heading with label–value rows / "Showing 1–12 of 24 ‹ 1 2 ›" / a white pill with a dot for map overlays ("● Live · Updated 14:29:05 ⟳") | card: `hue`, `lead`, `title`, `subtitle`, `badge`, `note`, `footer`, `back` `{title,subtitle,icon,onClose,children}`; strip: `label`, `end`, `bare`; indicator: `icon`, `label`, `hue`, `state`; facts: `items` `[{key,label,icon,value,hue,title}]`, `cols`; action: `icon`, `label`, `hue`, `onClick`, `disabled`; reading: `icon`, `label`, `value`, `sub`, `hue`, `percent`, `range`; rows: `heading`, `icon`, `count`, `rows`, `empty`; pager: `page`, `pageSize`, `total`, `onPage`; pill: `hue`, `pulse`, `action` `{icon,label,onClick}` | `<AssetCard hue="green" title="Truck 01" subtitle="KSA 4570" badge={…}><IndicatorStrip label="Sensors"><Indicator icon="snow" label="AC: On" hue="blue" /></IndicatorStrip><FactGrid items={facts} /></AssetCard>` | iotify |

Vehicle pictures are in `@iotify/illustrations`: `<VehiclePhoto category="Garbage Compactor" size={40} />` (compactor, truck, dump truck, tanker, pickup, van, bus, car, flatbed; anything else shows the truck).

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
