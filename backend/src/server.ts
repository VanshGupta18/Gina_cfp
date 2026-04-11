import { env } from './config/env.js';
import Fastify from 'fastify';
import type { FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifySse from '@fastify/sse';
import dbPlugin from './plugins/db.js';
import datasetsRoutes from './routes/datasets.js';
import conversationsRoutes from './routes/conversations.js';
import messagesRoutes from './routes/messages.js';

const ssePlugin = fastifySse as unknown as FastifyPluginAsync;

async function main() {
  const app = Fastify({ logger: true });

  // Core plugins
  await app.register(cors, { origin: true });
  await app.register(multipart);
  await app.register(ssePlugin);
  await app.register(dbPlugin);

  // TODO (Person B — Phase 1): register authPlugin here before routes
  // await app.register(authPlugin);

  app.get('/health', async () => ({ status: 'ok' }));

  // API routes
  await app.register(datasetsRoutes, { prefix: '/api' });
  await app.register(conversationsRoutes, { prefix: '/api' });
  await app.register(messagesRoutes, { prefix: '/api' });

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
