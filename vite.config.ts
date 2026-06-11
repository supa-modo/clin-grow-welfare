import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = (
    env.VITE_API_PROXY_TARGET
    ?? env.VITE_API_URL?.replace(/\/api\/?$/, '')
    ?? 'http://localhost:4000'
  ).replace(/\/$/, '');

  return {
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
            if (id.includes('node_modules/pdfjs-dist')) return 'pdfjs';
            return undefined;
          },
        },
      },
    },
    server: {
      port: 3000,
      host: true,
      proxy: { '/api': { target: apiProxyTarget, changeOrigin: true } },
    },
  };
});
