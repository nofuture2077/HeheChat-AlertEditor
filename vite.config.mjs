import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  plugins: [react(), tsconfigPaths(), mkcert()],
  base: '#{import.meta.env.VITE_SLUG}',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.mjs',
  }
});