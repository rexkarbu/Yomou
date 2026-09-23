import { Hono } from 'hono';
import type { LRUCache } from 'lru-cache';
import type { INovelProvider } from './interfaces/provider.interface.js';
import { meionovelProvider } from './providers/index.js';
import { responseCache } from './services/cache.service.js';
import { createNovelRouter } from './routes/novel.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

export interface AppOptions {
  provider?: INovelProvider;
  cache?: LRUCache<string, string>;
}

/**
 * Creates and configures the Hono application.
 * Allows simple dependency injection of provider and cache for isolated in-process testing.
 */
export function createApp(options?: AppOptions): Hono {
  const app = new Hono();
  const provider = options?.provider ?? meionovelProvider;
  const cache = options?.cache ?? responseCache;

  // 1. Health check endpoint (legacy response preserved as documented API exception)
  app.get('/health', (c) => {
    return c.json({ status: 'ok', service: 'yomou-server' });
  });

  // 2. Novel REST API router mounted at /api/novels
  const novelRouter = createNovelRouter(provider, cache);
  app.route('/api/novels', novelRouter);

  // 3. Global handlers for not-found (404) and exceptions
  app.notFound(notFoundHandler);
  app.onError(errorHandler);

  return app;
}
