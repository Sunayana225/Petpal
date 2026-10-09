import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command }) => {
  if (command === 'build' && process.env.VERCEL) {
    let apiUrl: URL;
    try { apiUrl = new URL(process.env.VITE_API_URL ?? ''); }
    catch { throw new Error('Vercel requires VITE_API_URL=https://your-api-domain/api before building.'); }
    if (apiUrl.protocol !== 'https:' || !['/api', '/api/'].includes(apiUrl.pathname) || apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash) throw new Error('VITE_API_URL must be an HTTPS API endpoint without credentials, query or fragment.');
  }
  return {
  plugins: [react(), tailwindcss()],
  resolve: { dedupe: ['react', 'react-dom'] },

  server: {
    port: 3000,
    // Dev-only proxy so the client can talk to the API without CORS games.
    proxy: {
      '/api': {
        target: process.env.PETPAL_API_PROXY_TARGET ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    // Never ship source maps. They hand out the full original source
    // (file names, comments, internal routes) to anyone who asks for
    // `<bundle>.js.map`. Upload them privately if you add error tracking.
    sourcemap: false,
    // Fail the build early if we accidentally bloat the bundle.
    chunkSizeWarningLimit: 600,
  },

  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
  };
});
