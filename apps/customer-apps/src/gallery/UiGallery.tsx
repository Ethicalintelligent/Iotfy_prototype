// /ui: every @iotify/ui component with example data. Demo content only (invented names).
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import './gallery.css';
import {
  Avatar,
  BarChart,
  Button,
  Card,
  CheckboxField,
  Chip,
  ColorField,
  DateField,
  Dot,
  EditBar,
  EmptyState,
  FieldGrid,
  FileField,
  Icon,
  IconButton,
  ICONS,
  KpiRow,
  KpiTile,
  LinkButtonDanger,
  Loading,
  Modal,
  Note,
  PageHeader,
  Popover,
  PopoverHeader,
  PopoverItem,
  PopoverSeparator,
  Rail,
  RailButton,
  SearchPalette,
  SearchTrigger,
  SelectField,
  Stack,
  StatusChip,
  Table,
  Tabs,
  TextField,
  useCtrlK,
  useToast,
  YesNo,
  type IconName,
  type RailSection,
} from '@iotify/ui';

const SECTIONS: RailSection[] = [
  {
    heading: 'Basics',
    items: [
      { key: 'buttons', label: 'Buttons', icon: 'check' },
      { key: 'cards', label: 'Card, Chip, Note', icon: 'features' },
      { key: 'tabs', label: 'Tabs, Avatar, Icons', icon: 'lookups' },
    ],
  },
  {
    heading: 'Data',
    items: [
      { key: 'fields', label: 'Fields', icon: 'edit' },
      { key: 'table', label: 'Table', icon: 'sheet' },
      { key: 'kpi', label: 'KPI tile, BarChart', icon: 'datapoints', badge: 2 },
      { key: 'empty', label: 'Empty, Loading', icon: 'help' },
    ],
  },
  {
    heading: 'Overlays',
    items: [
      { key: 'overlays', label: 'Modal, Toast, Popover', icon: 'side' },
      { key: 'editbar', label: 'EditBar', icon: 'lock', badge: 1, badgeTone: 'amber' },
      { key: 'shell', label: 'PageHeader, Rail, Search', icon: 'menu' },
    ],
  },
];

interface DemoAsset {
  id: string;
  name: string;
  type: string;
  site: string;
  status: string;
  tracked: boolean;
}
const ASSETS: DemoAsset[] = [
  {
    id: 'A-1001',
    name: 'Tipper 14',
    type: 'Truck',
    site: 'North Yard',
    status: 'Active',
    tracked: true,
  },
  {
    id: 'A-1002',
    name: 'Crane C2',
    type: 'Crane',
    site: 'Tower Site B',
    status: 'Installed',
    tracked: true,
  },
  {
    id: 'A-1003',
    name: 'Van 07',
    type: 'Van',
    site: 'Depot East',
    status: 'Pending',
    tracked: false,
  },
  {
    id: 'A-1004',
    name: 'Generator G5',
    type: 'Generator',
    site: 'Tower Site B',
    status: 'Suspended',
    tracked: false,
  },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 12 }}>
      <Card title={title}>{children}</Card>
    </section>
  );
}

export function UiGallery() {
  const toast = useToast();
  const navigate = useNavigate();
  const [active, setActive] = useState('buttons');
  const [mobileNav, setMobileNav] = useState(false);
  const [tab, setTab] = useState<'live' | 'history' | 'alerts'>('live');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: 'Tipper 14',
    type: 'truck',
    since: '2026-03-01',
    colour: '#03ad86',
    tracked: true,
    plate: 'DXB 4471',
  });
  const [saved, setSaved] = useState(form);
  const [modal, setModal] = useState(false);
  const [menu, setMenu] = useState<'notif' | 'user' | null>(null);
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState('');
  const [barError, setBarError] = useState(false);
  useCtrlK(() => setSearch(true));

  const changes = useMemo(
    () => (JSON.stringify(form) !== JSON.stringify(saved) ? ['Asset Tipper 14'] : []),
    [form, saved],
  );
  const go = (key: string) => {
    setActive(key);
    document.getElementById(key)?.scrollIntoView({ behavior: 'smooth' });
  };
  const results = SECTIONS.flatMap((s) => s.items)
    .filter((i) => !q || i.label.toLowerCase().includes(q.toLowerCase()))
    .map((i) => ({
      id: i.key,
      title: i.label,
      subtitle: 'Component · UI gallery',
      icon: i.icon,
      onSelect: () => go(i.key),
    }));

  const tools = (
    <>
      <SearchTrigger onClick={() => setSearch(true)} />
      <IconButton
        icon="bell"
        label="Notifications"
        badge={3}
        active={menu === 'notif'}
        onClick={() => setMenu(menu === 'notif' ? null : 'notif')}
      />
      <IconButton
        icon="user"
        label="Account"
        active={menu === 'user'}
        onClick={() => setMenu(menu === 'user' ? null : 'user')}
      >
        <Avatar name="Maya Rahman" tone="green" size={26} status="var(--success)" />
      </IconButton>
    </>
  );

  return (
    <div className="gallery">
      <Rail
        brand="UI gallery"
        subtitle="@iotify/ui components"
        logoText="UI"
        sections={SECTIONS}
        active={active}
        onSelect={go}
        mobileOpen={mobileNav}
        onMobileClose={() => setMobileNav(false)}
        footer={<RailButton icon="back" label="Back to the app" onClick={() => navigate('/')} />}
      />
      <main
        style={{
          padding: '4px 16px 120px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          maxWidth: 1100,
        }}
      >
        <PageHeader
          title="UI gallery"
          description="Every component in @iotify/ui with example data. Products build their screens only from these. The catalogue (packages/ui/CATALOGUE.md) lists the props."
          tools={tools}
        />
        <div className="gallery-mobile-nav">
          <Button icon="menu" size="sm" onClick={() => setMobileNav(true)}>
            Components
          </Button>
        </div>

        <Section id="buttons" title="Button, IconButton">
          <Stack>
            <Button variant="primary" icon="plus">
              Add asset
            </Button>
            <Button icon="edit">Edit</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger" icon="trash">
              Delete
            </Button>
            <Button size="sm">Small</Button>
            <Button size="sm" variant="primary">
              Small primary
            </Button>
            <Button disabled>Disabled</Button>
            <LinkButtonDanger>Delete this asset</LinkButtonDanger>
          </Stack>
          <Stack>
            <IconButton icon="bell" label="Notifications" badge={4} />
            <IconButton icon="bell" label="Warnings" badge={2} badgeTone="amber" />
            <IconButton icon="search" label="Search" outlined />
            <IconButton icon="help" label="Help" />
          </Stack>
        </Section>

        <Section id="cards" title="Card, Chip, StatusChip, YesNo, Note">
          <Stack align="stretch">
            <Card
              title="Fuel used"
              actions={<Button size="sm">View all</Button>}
              style={{ flex: '1 1 240px' }}
            >
              <span className="ui-muted">A card with a title and an action beside it.</span>
            </Card>
            <Card style={{ flex: '1 1 240px' }}>
              <span>A card with no title.</span>
            </Card>
          </Stack>
          <Stack>
            <Chip>Neutral</Chip>
            <Chip tone="blue">Selected</Chip>
            <Chip tone="green">Green</Chip>
            <Chip tone="amber">Amber</Chip>
            <Chip tone="red">Red</Chip>
            <Chip tone="warn">Warn</Chip>
            <Chip tone="bad">Bad</Chip>
            <Chip tone="info">Info</Chip>
          </Stack>
          <Stack>
            {['Active', 'Draft', 'Trial', 'Ended', 'Suspended', 'Unknown'].map((s) => (
              <StatusChip key={s} status={s} />
            ))}
            <YesNo value />
            <YesNo value={false} />
          </Stack>
          <Note>An amber note: something needs attention before you continue.</Note>
          <Note tone="green">A green note: all devices on this asset are installed.</Note>
          <Note tone="grey">A grey note: background information.</Note>
        </Section>

        <Section id="tabs" title="Tabs, Avatar, Dot, Icon">
          <Tabs
            label="Asset views"
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'live', label: 'Live' },
              { key: 'history', label: 'History' },
              { key: 'alerts', label: 'Alerts' },
            ]}
          />
          <Stack>
            <Avatar name="Maya Rahman" tone="green" />
            <Avatar name="Omar Haddad" tone="blue" status="var(--success)" />
            <Avatar name="Platform Admin" tone="violet" size={38} />
            <Avatar name="Fleet Lead" tone="amber" status="var(--warning)" />
            <Dot tone="red" /> <Dot tone="amber" /> <Dot tone="blue" /> <Dot tone="green" />{' '}
            <Dot tone="grey" />
          </Stack>
          <Stack gap={14}>
            {(Object.keys(ICONS) as IconName[]).map((n) => (
              <span
                key={n}
                title={n}
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  width: 64,
                  color: 'var(--ink-soft)',
                }}
              >
                <Icon name={n} />
                <small className="ui-muted" style={{ fontSize: 10 }}>
                  {n}
                </small>
              </span>
            ))}
          </Stack>
        </Section>

        <Section id="fields" title="Fields (read-only until Edit)">
          <Stack justify="space-between">
            <span className="ui-muted">
              {editing
                ? 'Editing: change a field, then Save or Cancel.'
                : 'Read-only. Press Edit to change.'}
            </span>
            {editing ? (
              <Stack gap={8}>
                <Button
                  onClick={() => {
                    setForm(saved);
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setSaved(form);
                    setEditing(false);
                    toast('Saved (demo: nothing is written)');
                  }}
                >
                  Save
                </Button>
              </Stack>
            ) : (
              <Button icon="edit" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </Stack>
          <FieldGrid>
            <TextField
              label="Name"
              value={form.name}
              readOnly={!editing}
              onChange={(name) => setForm({ ...form, name })}
            />
            <TextField
              label="Number plate"
              value={form.plate}
              readOnly={!editing}
              onChange={(plate) => setForm({ ...form, plate })}
              hint="As on the registration card"
            />
            <SelectField
              label="Asset type"
              value={form.type}
              readOnly={!editing}
              placeholder="—"
              onChange={(type) => setForm({ ...form, type })}
              options={[
                { value: 'truck', label: 'Truck' },
                { value: 'van', label: 'Van' },
                { value: 'crane', label: 'Crane' },
              ]}
            />
            <DateField
              label="In service since"
              value={form.since}
              readOnly={!editing}
              onChange={(since) => setForm({ ...form, since })}
            />
            <ColorField
              label="Map colour"
              value={form.colour}
              readOnly={!editing}
              onChange={(colour) => setForm({ ...form, colour })}
            />
            <FileField
              label="Photo"
              current="tipper-14.jpg"
              readOnly={!editing}
              accept="image/*"
              onFiles={(f) => toast(`${f.length} file(s) chosen`)}
            />
          </FieldGrid>
          <CheckboxField
            label="Track this asset on the live map"
            checked={form.tracked}
            readOnly={!editing}
            onChange={(tracked) => setForm({ ...form, tracked })}
          />
        </Section>

        <Section id="table" title="Table">
          <Table<DemoAsset>
            label="Demo assets"
            bare
            rows={ASSETS}
            onRowClick={(r) => toast(`Open ${r.name}`)}
            columns={[
              { header: 'Name', cell: 'name' },
              { header: 'Type', cell: 'type' },
              { header: 'Site', cell: 'site' },
              { header: 'Status', cell: (r) => <StatusChip status={r.status} /> },
              { header: 'Tracked', cell: (r) => <YesNo value={r.tracked} /> },
            ]}
          />
          <Table<DemoAsset>
            label="Empty table"
            rows={[]}
            columns={[
              { header: 'Name', cell: 'name' },
              { header: 'Site', cell: 'site' },
            ]}
            empty="No assets on this site yet."
          />
        </Section>

        <Section id="kpi" title="KPI tile, BarChart">
          <Note tone="grey">Demo data: these numbers are made up for the gallery.</Note>
          <KpiRow>
            <KpiTile label="Vehicles" value="42" sub="38 moving now" tone="ok" />
            <KpiTile label="Distance today" value="3,184 km" sub="+6% vs. yesterday" tone="ok" />
            <KpiTile label="Open alerts" value="7" sub="2 overspeed" tone="warn" />
            <KpiTile label="Fuel used" value="612 L" sub="Last 24 h" />
          </KpiRow>
          <Card
            title="Distance driven"
            actions={<span className="ui-muted">Last 7 days · km</span>}
          >
            <BarChart
              label="Distance driven, last 7 days"
              values={[2810, 3020, 2950, 3300, 2700, 2480, 3184]}
              labels={['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Today']}
              format={(v) => `${(v / 1000).toFixed(1)}k`}
            />
          </Card>
        </Section>

        <Section id="empty" title="EmptyState, Loading">
          <Stack align="stretch">
            <Card style={{ flex: '1 1 260px' }}>
              <EmptyState
                icon="assets"
                title="No assets yet"
                action={
                  <Button size="sm" variant="primary" icon="plus">
                    Add asset
                  </Button>
                }
              >
                Add your first vehicle or machine to start tracking.
              </EmptyState>
            </Card>
            <Card style={{ flex: '1 1 260px' }}>
              <Loading>Loading from Neon…</Loading>
            </Card>
          </Stack>
        </Section>

        <Section id="overlays" title="Modal, Toast, Popover">
          <Stack>
            <Button onClick={() => setModal(true)}>Open modal</Button>
            <Button onClick={() => toast('Signed in as Maya Rahman · Company admin')}>
              Show toast
            </Button>
            <Button onClick={() => setMenu('notif')}>Open notifications popover</Button>
            <Button onClick={() => setMenu('user')}>Open account popover</Button>
          </Stack>
          <span className="ui-muted">
            Popovers open at the top right, under the header tools. Esc or a click outside closes
            them.
          </span>
        </Section>

        <Section id="editbar" title="EditBar">
          <span className="ui-muted">
            The bottom reminder bar while editing. It shows fixed at the bottom of the page; here it
            is shown in place.
          </span>
          <EditBar inline changes={[]} onCancel={() => {}} onSave={() => {}} />
          <EditBar
            inline
            changes={['Assets', 'Sites']}
            onCancel={() => toast('Cancel')}
            onSave={() => toast('Save')}
          />
          <EditBar
            inline
            changes={['Assets']}
            error={barError ? 'duplicate key value violates unique constraint "assets_pkey"' : null}
            onCancel={() => setBarError(false)}
            onSave={() => setBarError(true)}
          />
          <span className="ui-muted">
            Press Save on the last one to see a failed save (Neon's error text, then Try again).
          </span>
        </Section>

        <Section id="shell" title="PageHeader, Rail, SearchPalette">
          <span className="ui-muted">
            The header of this page is a PageHeader: title, ⓘ for the description, and the top-right
            tools. The left menu is the Rail: 56 px, opens on hover. Press Ctrl+K for the search
            palette.
          </span>
          <Card padded={false} style={{ padding: '0 12px' }}>
            <PageHeader
              title="Tipper 14"
              back={{ label: 'Assets', onClick: () => toast('Back to Assets') }}
              meta="A-1001 · North Yard"
            />
          </Card>
        </Section>
      </main>

      {editing && (
        <EditBar
          changes={changes}
          onCancel={() => {
            setForm(saved);
            setEditing(false);
          }}
          onSave={() => {
            setSaved(form);
            setEditing(false);
            toast('Saved (demo: nothing is written)');
          }}
        />
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="New · Asset"
        badge="A-1005"
        footerStart={<Button variant="danger">Delete</Button>}
        footer={
          <>
            <Button onClick={() => setModal(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                setModal(false);
                toast('Saved (demo)');
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <FieldGrid>
          <TextField label="Name" value="" placeholder="e.g. Tipper 15" onChange={() => {}} />
          <SelectField
            label="Site"
            value=""
            placeholder="—"
            options={[
              { value: 'n', label: 'North Yard' },
              { value: 'b', label: 'Tower Site B' },
            ]}
            onChange={() => {}}
          />
        </FieldGrid>
      </Modal>

      <Popover open={menu === 'notif'} onClose={() => setMenu(null)} label="Notifications">
        <PopoverHeader label="Notifications">
          <Chip>3</Chip>
        </PopoverHeader>
        <PopoverItem
          lead={<Dot tone="red" />}
          title="Certificate pending"
          subtitle="Tipper 14 cannot clear its fitness certificate yet"
          onClick={() => setMenu(null)}
        />
        <PopoverItem
          lead={<Dot tone="amber" />}
          title="No device fitted"
          subtitle="Van 07"
          onClick={() => setMenu(null)}
        />
        <PopoverItem
          lead={<Dot tone="blue" />}
          title="Quote Q-204 is a draft"
          subtitle="Harbor Logistics (demo)"
          onClick={() => setMenu(null)}
        />
      </Popover>
      <Popover open={menu === 'user'} onClose={() => setMenu(null)} label="Account">
        <PopoverHeader label="Signed in">
          <Chip tone="green">Company</Chip>
        </PopoverHeader>
        <PopoverItem
          lead={<Avatar name="Maya Rahman" />}
          title="Maya Rahman"
          subtitle="maya.rahman@iotify.demo"
          selected
        />
        <PopoverItem icon="swap" title="Switch role" subtitle="Demo only" />
        <PopoverSeparator />
        <PopoverItem
          icon="out"
          title="Sign out"
          danger
          onClick={() => {
            setMenu(null);
            toast('Signed out (demo)');
          }}
        />
      </Popover>
      <SearchPalette
        open={search}
        onClose={() => {
          setSearch(false);
          setQ('');
        }}
        query={q}
        onQueryChange={setQ}
        results={results}
        placeholder="Search components…"
      />
    </div>
  );
}
