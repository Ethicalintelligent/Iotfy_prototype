// Placeholder "hello" page for Step 1. Styling here is temporary: real UI
// comes from @iotify/ui once Step 2 ports the design system.
export function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 48, lineHeight: 1.5 }}>
      <p style={{ margin: 0, opacity: 0.6 }}>IoTIFY prototype · port 5173</p>
      <h1 style={{ margin: '4px 0 8px' }}>Hello from Admin console</h1>
      <p style={{ margin: 0 }}>For EIT staff: catalogue, hardware, pricing, dealers.</p>
    </main>
  );
}
