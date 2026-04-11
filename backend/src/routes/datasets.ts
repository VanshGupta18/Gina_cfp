import type { FastifyInstance } from 'fastify';

export default async function datasetsRoutes(fastify: FastifyInstance) {
  // GET /api/datasets — list all datasets for the authenticated user
  fastify.get('/datasets', async (request) => {
    const { rows } = await fastify.db.query<{
      id: string;
      name: string;
      row_count: number | null;
      column_count: number | null;
      is_demo: boolean;
      demo_slug: string | null;
      created_at: string;
    }>(
      `SELECT id, name, row_count, column_count, is_demo, demo_slug, created_at
       FROM datasets
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [request.userId],
    );

    return {
      datasets: rows.map((r) => ({
        id: r.id,
        name: r.name,
        rowCount: r.row_count,
        columnCount: r.column_count,
        isDemo: r.is_demo,
        demoSlug: r.demo_slug,
        createdAt: r.created_at,
      })),
    };
  });

  // GET /api/datasets/:datasetId/semantic — get semantic state for a dataset
  fastify.get<{ Params: { datasetId: string } }>(
    '/datasets/:datasetId/semantic',
    async (request, reply) => {
      const { datasetId } = request.params;

      // Verify dataset belongs to this user before returning semantic data
      const ownerCheck = await fastify.db.query(
        'SELECT id FROM datasets WHERE id = $1 AND user_id = $2',
        [datasetId, request.userId],
      );
      if (ownerCheck.rowCount === 0) {
        return reply.status(404).send({ error: 'Dataset not found' });
      }

      const { rows } = await fastify.db.query<{
        id: string;
        dataset_id: string;
        schema_json: unknown;
        understanding_card: string | null;
        is_user_corrected: boolean;
        updated_at: string;
      }>(
        `SELECT id, dataset_id, schema_json, understanding_card, is_user_corrected, updated_at
         FROM semantic_states
         WHERE dataset_id = $1`,
        [datasetId],
      );

      if (rows.length === 0) {
        return reply.status(404).send({ error: 'Semantic state not found' });
      }

      const s = rows[0];
      return {
        id: s.id,
        datasetId: s.dataset_id,
        schemaJson: s.schema_json,
        understandingCard: s.understanding_card,
        isUserCorrected: s.is_user_corrected,
        updatedAt: s.updated_at,
      };
    },
  );
}
