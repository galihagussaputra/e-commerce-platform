import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const proxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': { target: proxyTarget, changeOrigin: true },
    },
  },
  preview: { host: '0.0.0.0', port: 5173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
    restoreMocks: true,
  },
});
