import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    https: true,
    host: 'localhost',
    port: 5173,
  },
  build: {
    target: 'esnext',
    minify: 'terser',
  },
});
