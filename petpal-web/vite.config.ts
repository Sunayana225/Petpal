import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    port: 3000,
    // Dev-only proxy so the client can talk to the API without CORS games.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
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
});
