import express from 'express';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { createFavoritProxy } from './favoritProxy.js';

const dist = fileURLToPath(new URL('../dist', import.meta.url));
if (!existsSync(`${dist}/index.html`)) {
  console.error('Сначала выполните npm run build.');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.use(createFavoritProxy({ apiKey: process.env.FAVORIT_API_KEY }));
app.use(express.static(dist));

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT) || 3000;
app.listen(port, host, () => console.log(`Приложение запущено: http://${host}:${port}`));
