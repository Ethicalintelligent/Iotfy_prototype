# EIT Smart Track Design System

**Every screen, component, product, app and generated HTML page follows this file.** It is the readable copy of the EIT Smart Track *Design System* file. The same values are in code in [`packages/ui/src/styles/tokens.css`](../packages/ui/src/styles/tokens.css); this file and that one always change together, in the same commit.

- **Components:** [`packages/ui/CATALOGUE.md`](../packages/ui/CATALOGUE.md) lists what to build with. This file says what those components look like.
- **Live view:** every component at **`/ui`** in customer-apps (http://localhost:5175/ui).

## 1. Rules (binding)

1. **Tokens only.** Every colour, font, font size, font weight, spacing value, radius, shadow, z-index, control height, icon size and animation timing is a `var(--token)` from this file. No raw `#hex`, `rgb()`, `px` font sizes, numeric `font-weight` or `z-index` numbers in any CSS or `style={{…}}` outside `tokens.css`.
2. **Only Design System colours.** No blends, no `color-mix()`, no opacity tricks to make a new shade, no "a bit lighter" variants. If a tint is needed, use one of the tints in §2.4.
3. **Nothing new without the Design System.** A value that is not here is not allowed. If a design really needs one, it is first added to the Design System file, then to `tokens.css` and this file (core owner's approval, see root `CLAUDE.md` §2).
4. **Products never style.** Products use `@iotify/ui` components and pass a **hue name** or **tone** (`hue="green"`, `tone="warn"`), never a colour. No CSS files in product folders.
5. **One colour per meaning, everywhere.** A vehicle status, an alert level or a chip tone has the same colour on markers, chips, legends, tables and charts.
6. **Light theme only** (`color-scheme: light`).

## 2. Colour

### 2.1 Brand

| Token | Value | Use |
|---|---|---|
| `--eit-green` | `#009863` | Primary brand colour, primary buttons |
| `--eit-teal` | `#005965` | Second brand colour (gradient end) |
| `--eit-mint` | `#03ad86` | Focus ring, highlighted chart bar, glow |
| `--eit-teal-deep` | `#016a64` | Deep teal accents |
| `--grad-brand` | green → teal, 90° | Primary button, brand logo square, green avatar |

### 2.2 Vehicle status (one colour per status)

| Token | Value | Status | Hue name |
|---|---|---|---|
| `--vs-running` | `#009863` | Running | `green` |
| `--vs-stop` | `#c3161a` | Stopped | `red` |
| `--vs-idle` | `#025efe` | Idle | `blue` |
| `--vs-overspeed` | `#f76c09` | Overspeed | `orange` |
| `--vs-towed` | `#07b1b4` | Towed | `teal` |
| `--vs-notrans` | `#2b333c` | No transmission | `black` |
| `--vs-ytt` | `#9aa3b2` | Yet to transmit | `grey` |

### 2.3 Hues (what products pass to components)

`slate` (`--eit-muted-dialog`), `green`, `red`, `blue`, `black`, `orange`, `teal`, `grey` (the status colours above), `purple` (`#7c4dff`, Medium priority), `amber` (`--warning`), `gold` (`#ffb020`), `silver` (`--vs-ytt`), `bronze` (`#e07b00`). Tokens: `--hue-<name>`. Tinted backgrounds for a hue come from §2.4 via `--hue-tint`, never from a blend.

### 2.4 Status, feedback and tints

| Token | Value | Use |
|---|---|---|
| `--success` | `#069d37` | Success text and icons |
| `--warning` | `#e3940e` | Warning text and icons |
| `--danger` | `#c3161a` | Error text, red icons |
| `--danger-strong` / `--eit-danger-strong` | `#d92d20` | Solid danger button (only inside a confirmation), error ring |
| `--info` | `#025efe` | Info text and icons |
| `--neutral-dot` | `#94a0af` | Neutral status dot |
| `--link` / `--link-hover` | `#0e7f5e` / `#0a5c4a` | Text links |
| `--kpi-ok` / `--kpi-warn` | `#028a6b` / `#b86e00` | KPI sub line |

Tints (background + its text colour; use them as pairs):

| Background | Value | Text on it | Value |
|---|---|---|---|
| `--tint-green` | `#e9f7f0` | `--on-tint-green` | `#05703a` |
| `--tint-blue` | `#e8f1ff` | `--on-tint-info` | `#2b4fa8` |
| `--tint-red` (`--eit-danger-tint`) | `#fdecec` | `--danger` | `#c3161a` |
| `--tint-amber` | `#fcf3e1` | `--on-tint-amber` / `--on-tint-note` | `#8a5400` / `#6b4100` |
| `--tint-violet` | `#f4ecfd` | `--hue-purple` | `#7c4dff` |
| `--tint-warn` | `#fff1dc` | `--on-tint-warn` | `#9a5b00` |
| `--tint-bad` | `#fde4e4` | `--on-tint-bad` | `#b4232a` |
| `--tint-info` | `#e6eeff` | `--on-tint-info` | `#2b4fa8` |

Gradients: `--grad-selected` (`#0e8f5e → #0b6e58 → #0a4f55`, selected tiles), `--grad-warning` (`#ffb020 → #e07b00`), `--grad-danger` (`#ff5a5f → #c3161a`). Avatar tones: `--tone-violet`, `--tone-blue`, `--tone-green`, `--tone-amber`.

### 2.5 Selection, hover, active

| Token | Value | Use |
|---|---|---|
| `--select-bg` | `#e8f5ef` | Selected row / card, data-grid header (`--grid-head`) |
| `--select-ring` | `#a9d8c3` | Selected ring, grid header line |
| `--select-icon` | `#12955f` | Tick / icon on a selected item |
| `--select-fg` | `#0b6e58` | Text on a selected item |
| `--active-bg` / `--active-fg` | `#e6f7ef` / `#00b368` | Active tab, pressed toggle |
| `--hover-fg` | `#007a47` | Text / icon on hover |
| `--hover-green` | `#f2fbf7` | Green hover background |
| `--menu-on` | `#e7f8ef` | Current menu item |
| `--surface-hover` | `#eef1f4` | Neutral hover background |

### 2.6 Text and surfaces

| Token | Value | Use |
|---|---|---|
| `--ink` | `#0b1b2b` | Main text |
| `--ink-950` | `#01152c` | Dialog titles |
| `--ink-soft` | `#4b5563` | Secondary text |
| `--muted-dialog` | `#5b6572` | Descriptions in dialogs |
| `--muted` / `--muted-1` | `#6b7685` / `#748093` | Grey labels, hints |
| `--page` | `#f7f8fa` | Page background |
| `--sub` | `#f9f9fb` | Subtle panels |
| `--white` | `#fff` | Cards, inputs, dialogs |

### 2.7 Lines

| Token | Value | Use |
|---|---|---|
| `--border` | `#d7d8db` | General border |
| `--border-input` | `#d7dae0` | Inputs |
| `--border-chip` | `#d5dadf` | Chips |
| `--border-tabs` | `#c9ced6` | Tabs |
| `--border-map` | `#dce5e1` | Map frames |
| `--border-tile` | `#dde1e6` | Tiles |
| `--hairline` | `#e3e6ea` | Thin separators |
| `--card-ring` | `#e9ecef` | Card outline |
| `--divider` | `#eef0f2` | Row dividers |
| `--border-soft` | `#f2f4f6` | Very light lines |

### 2.8 Navigation rail, charts, map

Rail: `--nav-surface` `#01152c`, `--nav-rest` `#b3b9c0`, `--nav-heading` `#7d8794`, `--nav-hover` (white 8%), `--nav-divider` (white 10%), `--nav-active-icon` `#2fe0b4`.
Charts: `--chart-bar` `#b8e6da`, `--chart-bar-on` (mint), `--chart-value` `#5b6b7a`, `--chart-label` `#8a97a5`. Map background: `--map-bg` `#0d2a4a`.

## 3. Typography

Font: **Instrument Sans** (`--font`), weights 400–700 loaded from Google Fonts.

| Token | Size | Use |
|---|---|---|
| `--text-xs` | 10px | Badges, tiny captions |
| `--text-sm` | 11px | Small grey text (`SmallText xs`), table meta |
| `--text-md` | 12px | Default UI text, labels, `SmallText` |
| `--text-note` | 12.5px | Use / avoid notes, toast descriptions |
| `--text-base` | 13px | Body copy, sub-headings, descriptions |
| `--text-lg` | 14px | Card titles, emphasised text |
| `--text-xl` | 16px | Dialog / drawer titles |
| `--text-h2` | 18px | Section heading (700, letter-spacing -0.01em) |
| `--text-kpi` | 24px | KPI numbers; page heading (600) |

| Token | Weight | Use |
|---|---|---|
| `--weight-regular` | 500 | Body text (the design's "regular" is 500) |
| `--weight-medium` | 600 | Labels, buttons, page heading |
| `--weight-bold` | 700 | Headings, KPI values |
| `--weight-heavy` | 800 | Rare emphasis (rank numbers) |

## 4. Spacing, radii, sizes

| Spacing | `--space-1` | `--space-2` | `--space-3` | `--space-4` | `--space-5` | `--space-6` | `--space-7` | `--space-8` |
|---|---|---|---|---|---|---|---|---|
| px | 4 | 6 | 8 | 10 | 12 | 16 | 20 | 24 |

| Radius | Value | Use |
|---|---|---|
| `--radius-xs` | 6px | Small chips, icon buttons |
| `--radius-input` | 7px | Inputs |
| `--radius-sm` | 8px | Buttons |
| `--radius-md` | 10px | Menus, small cards |
| `--radius-panel` | 12px | Panels, cards |
| `--radius-lg` / `--radius-tile` | 14px | Tiles |
| `--radius-xl` / `--radius-dialog` | 16px | Dialogs, drawers |
| `--radius-pill` | 999px | Pills |

Control heights: `--ctl-h-toolbar` 20, `--ctl-h-compact` 26, `--ctl-h-sm` 28, `--ctl-h-md` 32, `--ctl-h-default` 34, `--ctl-h-map` 36, `--ctl-h-lg` 40 (px). Buttons: `sm` 28, `md` 34, `lg` 40.
Icon sizes: `--icon-xs` 12, `--icon-sm` 14, `--icon-md` 16, `--icon-lg` 18, `--icon-xl` 20 (px).
Layout: `--rail-width` 56px, `--rail-width-open` 224px. Rail `look="grouped"` (EIT Smart Track sidebar, GPS Vehicle Tracking): `--rail-width-wide` 76px, `--rail-width-wide-open` 206px, 70px brand row with the EIT logo, 39px items (`--radius-sm`), full-width dividers between sections, 24/7 Support card at the bottom when open.

## 5. Elevation, rings, layers, motion

| Token | Use |
|---|---|
| `--shadow-hairline` | Barely lifted (chips, small tiles) |
| `--shadow-panel` | Panels |
| `--shadow-card-app` | App cards (shadow + 1px ring) |
| `--shadow-selected` | Selected tile |
| `--shadow-map-ctl` | Map buttons |
| `--shadow-dropdown` (= `--shadow-menu`, `--shadow-popover`) | Menus, popovers |
| `--shadow-toast` | Toasts |
| `--shadow-editbar` | Bottom edit bar |
| `--shadow-dialog` | Dialogs |
| `--focus-ring` (= `--ring-brand`) | Keyboard focus: inset 1.5px mint |
| `--ring-input` / `--ring-error` | Input outline / error outline (1.5px) |
| `--ring-control`, `--ring-card` | Control and card outlines |
| `--scrim` | `rgba(1,21,44,.45)` behind every overlay |
| `--glass-fill`, `--glass-blur` | Frosted map overlays |

**Layers (the only z-index values):** `--z-map-layer` 2, `--z-map-ctl` 4, `--z-sticky` 6, `--z-dropdown` 40, `--z-drawer-scrim` 59, `--z-drawer` 60, `--z-toast` 400, `--z-modal-scrim` 2000, `--z-modal` 2001, `--z-tooltip` 9999.

**Motion:** `--dur-fast` 0.15s (hover, press), `--dur-base` 0.3s (open, slide), `--ease-std` ease. Respect `prefers-reduced-motion`: no pulsing, scrolling or sliding when it is set.

## 6. Component look (summary)

The full list with props is in the catalogue; these are the visual rules every component keeps.

- **Buttons:** one primary per surface (brand gradient, white text); secondary for Cancel / Back; solid danger (`--danger-strong`) only inside a confirmation; heights 28 / 34 / 40.
- **Inputs:** white, `--ring-input`, `--radius-input`, mint `--focus-ring`; error = `--ring-error` + red helper text; read-only looks like plain text until **Edit**.
- **Cards and panels:** white, `--radius-panel`, `--shadow-card-app`; optional icon tile + title + grey subtitle.
- **Tables / data grids:** mint header (`--grid-head`), `--divider` rows, numbers right-aligned and tabular, 10 rows per page by default.
- **Chips and pills:** a tint + its text colour from §2.4, or a hue; `--radius-pill`.
- **Dialogs and drawers:** `--radius-dialog`, `--shadow-dialog`, `--scrim`; Esc and click outside close.
- **Toasts:** top right, at most 4, 4 s (errors 6 s, with Neon's exact error text).
- **Page header:** one thin row (~40px), title `--text-kpi` / 600; page actions sit next to the content, not in the header.
- **Demo data** is labelled as demo on the screen (root `CLAUDE.md` §8).

## 7. Checklist before finishing any UI change

- [ ] Component taken from `@iotify/ui` (or added there first, with a catalogue entry).
- [ ] No raw colour, font size, font weight, spacing, radius, shadow or z-index outside `tokens.css`.
- [ ] Colours come from tokens or hue names; no blends or new shades.
- [ ] Status colours match §2.2 everywhere on the screen.
- [ ] Focus ring visible, reduced motion respected.
- [ ] If a token was added or changed: Design System file, `tokens.css` and this file updated together.
