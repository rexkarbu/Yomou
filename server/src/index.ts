import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'yomou-server' });
});

const port = Number(process.env.PORT) || 3000;

if (process.env.NODE_ENV !== 'test') {
  console.log(`Server listening on port ${port}`);
  serve({
    fetch: app.fetch,
    port,
  });
}

export default app;
export * from './interfaces/index.js';
export * from './errors/index.js';
export * from './services/httpClient.js';
export * from './providers/index.js';
export * from './utils/parser.js';
export * from './types/index.js';

