import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-charts': ['recharts'],
          'vendor-utils': ['html2canvas', 'qrcode.react', 'canvas-confetti'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});