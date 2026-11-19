import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@iotify/ui';
import { DataProvider } from '@iotify/data';
import { AuthProvider } from '@iotify/auth';
import { App } from './App';

document.title = 'IoTIFY Admin Console';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DataProvider>
        <ToastProvider>
          <AuthProvider app="admin">
            <App />
          </AuthProvider>
        </ToastProvider>
      </DataProvider>
    </BrowserRouter>
  </StrictMode>,
);
