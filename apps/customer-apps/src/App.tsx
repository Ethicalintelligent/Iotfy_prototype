import { Link, Route, Routes } from 'react-router-dom';
import { UiGallery } from './gallery/UiGallery';
import { DataDebug } from './debug/DataDebug';
import { RulesDebug } from './debug/RulesDebug';

// Placeholder home for now. Sign-in and "My apps" arrive in Step 9.
function Home() {
  return (
    <main style={{ padding: 48, lineHeight: 1.5 }}>
      <p style={{ margin: 0 }} className="ui-muted">
        IoTIFY prototype · port 5175
      </p>
      <h1 style={{ margin: '4px 0 8px' }}>Hello from Customer apps</h1>
      <p style={{ margin: 0 }}>
        For companies: sign-in, My apps, and every product&apos;s own screens.
      </p>
      <p>
        <Link to="/ui">Open the UI gallery →</Link>
        <br />
        <Link to="/debug/data">Check the data layer →</Link>
        <br />
        <Link to="/debug/rules">Check the business rules →</Link>
      </p>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/ui" element={<UiGallery />} />
      <Route path="/debug/data" element={<DataDebug />} />
      <Route path="/debug/rules" element={<RulesDebug />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
