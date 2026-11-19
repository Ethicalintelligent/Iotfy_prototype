// Placeholder "hello" page for Step 1. Styling here is temporary: real UI
// comes from @iotify/ui once Step 2 ports the design system.
export function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 48, lineHeight: 1.5 }}>
      <p style={{ margin: 0, opacity: 0.6 }}>IoTIFY prototype · port 5174</p>
      <h1 style={{ margin: '4px 0 8px' }}>Hello from Partner portal</h1>
      <p style={{ margin: 0 }}>For dealers: customers, quotes, stock, installation, support.</p>
    </main>
  );
}
