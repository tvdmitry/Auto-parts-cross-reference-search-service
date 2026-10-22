import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createFavoritProxy } from './server/favoritProxy.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'FAVORIT_');
  const installProxy = (server) => {
    server.middlewares.use(createFavoritProxy({ apiKey: env.FAVORIT_API_KEY }));
  };

  return {
    plugins: [react(), {
      name: 'favorit-api',
      configureServer: installProxy,
      configurePreviewServer: installProxy,
    }],
  };
});
