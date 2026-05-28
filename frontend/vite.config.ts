import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendPort = Number(process.env.BACKEND_PORT || '3000');

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.FRONTEND_PORT || '3001'),
    open: process.env.ELECTRON_DEV !== '1',
    proxy: {
      '/api': `http://127.0.0.1:${backendPort}`,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
