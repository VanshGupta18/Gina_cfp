import { env } from './config/env.js';
import Fastify from 'fastify';
import type { FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifySse from '@fastify/sse';
import dbPlugin from './plugins/db.js';
import authPlugin from './plugins/auth.js';
import usersRoutes from './routes/users.js';

const ssePlugin = fastifySse as unknown as FastifyPluginAsync;

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(multipart);
  await app.register(ssePlugin);
  await app.register(dbPlugin);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(
    async (api) => {
      await api.register(authPlugin);
      await api.register(usersRoutes);
    },
    { prefix: '/api' },
  );

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
