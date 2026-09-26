import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  base: './',
  plugins: [react()],
  // ffmpeg.wasm spawns its own worker; pre-bundling breaks the worker URL
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg']
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true
  }
});
