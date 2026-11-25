import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppRouter } from '@iotify/app-kit';
import { ToastProvider } from '@iotify/ui';
import { DataProvider } from '@iotify/data';
import { App } from './App';

document.title = 'IoTIFY Neon Database';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter>
      <DataProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </DataProvider>
    </AppRouter>
  </StrictMode>,
);
