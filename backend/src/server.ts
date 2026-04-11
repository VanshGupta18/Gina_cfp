import { env } from './config/env.js';
import Fastify from 'fastify';
import type { FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifySse from '@fastify/sse';
import dbPlugin from './plugins/db.js';

const ssePlugin = fastifySse as unknown as FastifyPluginAsync;

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(multipart);
  await app.register(ssePlugin);
  await app.register(dbPlugin);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
