import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [basicSsl()],
  server: {
    host: 'localhost',
    port: 5173,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
  },
});
