import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy /api to the Express server so refresh cookies stay same-origin in dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
