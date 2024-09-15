import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  plugins: [react(), tsconfigPaths(), mkcert()],
  base: '/HeheChat-AlertEditor/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.mjs',
  }
});