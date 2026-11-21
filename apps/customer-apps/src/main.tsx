import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppRouter } from '@iotify/app-kit';
import { ToastProvider } from '@iotify/ui';
import { DataProvider } from '@iotify/data';
import { AuthProvider } from '@iotify/auth';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter>
      <DataProvider>
        <ToastProvider>
          <AuthProvider app="customer">
            <App />
          </AuthProvider>
        </ToastProvider>
      </DataProvider>
    </AppRouter>
  </StrictMode>,
);
