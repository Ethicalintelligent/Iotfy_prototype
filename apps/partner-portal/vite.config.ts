import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { neonDevSql } from '@iotify/data/vite';

export default defineConfig({
  plugins: [react(), neonDevSql()],
  // .env.local lives in the project folder, shared by all three apps.
  envDir: '../..',
  server: { port: 5174, strictPort: true },
  preview: { port: 5174, strictPort: true },
});
