import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) return 'react';
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/zod') || id.includes('node_modules/@hookform')) return 'forms';
          if (id.includes('node_modules/recharts')) return 'charts';
          if (id.includes('node_modules/framer-motion')) return 'motion';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
});
