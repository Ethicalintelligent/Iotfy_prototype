// /debug/data: proves the data layer works (row counts for every core table, read live from Neon).
import { Link } from 'react-router-dom';
import { PageHeader } from '@iotify/ui';
import { DataSourceScreen } from '@iotify/app-kit';

export function DataDebug() {
  return (
    <main
      style={{
        padding: '4px 16px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxWidth: 900,
      }}
    >
      <PageHeader
        title="Data layer check"
        description="Reads every core table from Neon through @iotify/data and shows how many rows each has. Re-reads when you come back to this tab."
        tools={<Link to="/">Home</Link>}
      />
      <DataSourceScreen />
    </main>
  );
}
