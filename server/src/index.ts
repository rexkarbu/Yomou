import { serve } from '@hono/node-server';
import { createApp } from './app.js';

const app = createApp();
const port = Number(process.env.PORT) || 3000;

if (process.env.NODE_ENV !== 'test' && !process.env.YOMOU_NO_LISTEN) {
  console.log(`Server listening on port ${port}`);
  serve({
    fetch: app.fetch,
    port,
  });
}

export default app;
export { createApp };
export * from './interfaces/index.js';
export * from './errors/index.js';
export * from './services/httpClient.js';
export * from './services/cache.service.js';
export * from './providers/index.js';
export * from './utils/parser.js';
export * from './types/index.js';
export * from './middlewares/errorHandler.js';
export * from './middlewares/cacheMiddleware.js';
