import type { FastifyInstance } from 'fastify';

export default async function conversationsRoutes(fastify: FastifyInstance) {
  // GET /api/datasets/:datasetId/conversations — list conversations for a dataset
  fastify.get<{ Params: { datasetId: string } }>(
    '/datasets/:datasetId/conversations',
    async (request, reply) => {
      const { datasetId } = request.params;

      const ownerCheck = await fastify.db.query(
        'SELECT id FROM datasets WHERE id = $1 AND (user_id = $2 OR is_demo = true)',
        [datasetId, request.userId],
      );
      if (ownerCheck.rowCount === 0) {
        return reply.status(404).send({ error: 'Dataset not found' });
      }

      const { rows } = await fastify.db.query<{
        id: string;
        dataset_id: string;
        user_id: string;
        title: string | null;
        created_at: string;
        updated_at: string;
      }>(
        `SELECT id, dataset_id, user_id, title, created_at, updated_at
         FROM conversations
         WHERE dataset_id = $1 AND user_id = $2
         ORDER BY updated_at DESC`,
        [datasetId, request.userId],
      );

      return {
        conversations: rows.map((r) => ({
          id: r.id,
          datasetId: r.dataset_id,
          userId: r.user_id,
          title: r.title,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
      };
    },
  );

  // POST /api/datasets/:datasetId/conversations — create a new conversation
  fastify.post<{ Params: { datasetId: string } }>(
    '/datasets/:datasetId/conversations',
    async (request, reply) => {
      const { datasetId } = request.params;

      const ownerCheck = await fastify.db.query(
        'SELECT id FROM datasets WHERE id = $1 AND (user_id = $2 OR is_demo = true)',
        [datasetId, request.userId],
      );
      if (ownerCheck.rowCount === 0) {
        return reply.status(404).send({ error: 'Dataset not found' });
      }

      const { rows } = await fastify.db.query<{
        id: string;
        dataset_id: string;
        user_id: string;
        title: string | null;
        created_at: string;
        updated_at: string;
      }>(
        `INSERT INTO conversations (dataset_id, user_id)
         VALUES ($1, $2)
         RETURNING id, dataset_id, user_id, title, created_at, updated_at`,
        [datasetId, request.userId],
      );

      const c = rows[0];
      return {
        id: c.id,
        datasetId: c.dataset_id,
        userId: c.user_id,
        title: c.title,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      };
    },
  );
}
