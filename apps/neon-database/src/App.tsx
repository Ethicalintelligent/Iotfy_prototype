// Neon Database app (port 5176, dev server only): the developer's own branch database, view-only.
// No sign-in: the dev server connects to this computer's database only after checking that the Git
// branch dev/<name> and the database's owner label <name> match (packages/data/server/branch-db.js).
// Other developers' databases are never listed or named. On the admin's computer (main) it shows
// nothing.
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '@iotify/app-kit';
import { NeonDatabasePage } from './NeonDatabasePage';

const SECTIONS = [
  {
    heading: 'Your branch database',
    items: [
      { key: 'overview', label: 'Overview', icon: 'sheet' as const },
      { key: 'tables', label: 'Tables', icon: 'list' as const },
    ],
  },
];
const TITLES: Record<string, [string, string]> = {
  overview: [
    'Neon Database',
    'The database of your own developer branch, view-only. Nothing else is listed here.',
  ],
  tables: ['Tables', 'Every table on your branch. View-only: the first 200 rows of each.'],
};

export function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = pathname.split('/')[1] === 'tables' ? 'tables' : 'overview';
  const [title, description] = TITLES[active]!;
  return (
    <AppShell
      brandName="IoTIFY"
      subtitle="Neon Database"
      sections={SECTIONS}
      active={active}
      onSelect={(k) => navigate('/' + k)}
      title={title}
      description={description}
    >
      <Routes>
        <Route path="/overview" element={<NeonDatabasePage view="overview" />} />
        <Route path="/tables/:schema?/:table?" element={<NeonDatabasePage view="tables" />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </AppShell>
  );
}
