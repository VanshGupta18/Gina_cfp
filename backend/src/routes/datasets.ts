import { randomUUID } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parseCSV } from '../utils/csvParser.js';
import { uploadToS3 } from '../utils/s3.js';
import { profileColumns, coerceValue } from '../semantic/profiler.js';
import type { ColumnProfile } from '../semantic/profiler.js';
import { enrichProfilerColumns, generateUnderstandingCard } from '../semantic/enricher.js';
import {
  buildColumnEmbeddingText,
  embedTextsBatched,
  insertSchemaEmbeddings,
} from '../semantic/embedder.js';
import { mergeAllProfilerColumns, profilerToEnricherInput } from '../semantic/mergeProfile.js';

/** Maximum accepted CSV file size: 50 MB */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const semanticPatchBodySchema = z.object({
  corrections: z
    .array(
      z.object({
        columnName: z.string(),
        newSemanticType: z.enum([
          'amount',
          'date',
          'category',
          'identifier',
          'flag',
          'text',
        ]),
        newBusinessLabel: z.string(),
        newDescription: z.string(),
      }),
    )
    .min(1),
});

type StoredSchemaJson = {
  tableName: string;
  columns: ColumnProfile[];
  understandingCard?: string;
};

/** Allowed MIME types for CSV uploads */
const CSV_MIMETYPES = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
  'application/octet-stream',
]);

/**
 * Sanitize a column name so it is safe to use as a double-quoted PostgreSQL identifier.
 * Double-quotes inside the name are stripped by the profiler; this just adds the wrapping.
 */
function quotedIdent(name: string): string {
  return `"${name}"`;
}

/**
 * Insert rows into a dynamic dataset table in batches to avoid huge parameter arrays.
 */
async function bulkInsertRows(
  client: { query(sql: string, params?: unknown[]): Promise<unknown> },
  tableName: string,
  profiles: ColumnProfile[],
  rows: Record<string, string>[],
): Promise<void> {
  if (rows.length === 0) return;

  const BATCH = 500;
  const colCount = profiles.length;
  const quotedCols = profiles.map((p) => quotedIdent(p.columnName)).join(', ');

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const placeholders = batch
      .map((_, bIdx) => {
        const offset = bIdx * colCount;
        const placeholderList = profiles
          .map((_, cIdx) => `$${offset + cIdx + 1}`)
          .join(', ');
        return `(${placeholderList})`;
      })
      .join(', ');

    const values = batch.flatMap((row) =>
      profiles.map((p) => coerceValue(row[p.columnName] ?? '', p.postgresType)),
    );

    await client.query(
      `INSERT INTO "${tableName}" (${quotedCols}) VALUES ${placeholders}`,
      values,
    );
  }
}

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
       WHERE user_id = $1 OR is_demo = true
       ORDER BY is_demo DESC, created_at DESC`,
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

  // GET /api/datasets/:datasetId — get a single dataset by ID
  fastify.get<{ Params: { datasetId: string } }>(
    '/datasets/:datasetId',
    async (request, reply) => {
      const { datasetId } = request.params;

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
         WHERE id = $1 AND (user_id = $2 OR is_demo = true)`,
        [datasetId, request.userId],
      );

      if (rows.length === 0) {
        return reply.status(404).send({ error: 'Dataset not found' });
      }

      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        rowCount: r.row_count,
        columnCount: r.column_count,
        isDemo: r.is_demo,
        demoSlug: r.demo_slug,
        createdAt: r.created_at,
      };
    },
  );

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

  // PATCH /api/datasets/:datasetId/semantic — user corrections + re-embed (§4.2)
  fastify.patch<{
    Params: { datasetId: string };
    Body: z.infer<typeof semanticPatchBodySchema>;
  }>('/datasets/:datasetId/semantic', async (request, reply) => {
    const parsedBody = semanticPatchBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'Invalid body',
        details: parsedBody.error.flatten(),
      });
    }

    const { datasetId } = request.params;
    const { corrections } = parsedBody.data;

    const ownerCheck = await fastify.db.query(
      'SELECT id FROM datasets WHERE id = $1 AND user_id = $2',
      [datasetId, request.userId],
    );
    if (ownerCheck.rowCount === 0) {
      return reply.status(404).send({ error: 'Dataset not found' });
    }

    const { rows: semRows } = await fastify.db.query<{
      id: string;
      schema_json: unknown;
      understanding_card: string | null;
      updated_at: string;
    }>(
      `SELECT id, schema_json, understanding_card, updated_at
       FROM semantic_states WHERE dataset_id = $1`,
      [datasetId],
    );

    if (semRows.length === 0) {
      return reply.status(404).send({ error: 'Semantic state not found' });
    }

    const sem = semRows[0];
    const rawSchema = sem.schema_json as Record<string, unknown> | null;
    if (
      !rawSchema ||
      typeof rawSchema.tableName !== 'string' ||
      !Array.isArray(rawSchema.columns)
    ) {
      return reply.status(500).send({ error: 'Stored semantic state is invalid' });
    }

    const schema = {
      tableName: rawSchema.tableName,
      columns: rawSchema.columns as ColumnProfile[],
      understandingCard:
        typeof rawSchema.understandingCard === 'string' ? rawSchema.understandingCard : undefined,
    };
    const columnByName = new Map(schema.columns.map((c) => [c.columnName, c]));

    for (const c of corrections) {
      const col = columnByName.get(c.columnName);
      if (!col) {
        return reply.status(400).send({ error: `Unknown column: ${c.columnName}` });
      }
      col.semanticType = c.newSemanticType;
      col.businessLabel = c.newBusinessLabel;
      col.description = c.newDescription;
    }

    const updatedSchema: StoredSchemaJson = {
      tableName: schema.tableName,
      columns: schema.columns,
      understandingCard: schema.understandingCard ?? sem.understanding_card ?? undefined,
    };

    let embeddingVectors: number[][];
    try {
      const texts = updatedSchema.columns.map((col) => buildColumnEmbeddingText(col));
      embeddingVectors = await embedTextsBatched(texts);
    } catch (err) {
      fastify.log.error({ err }, 'Re-embedding failed after semantic PATCH');
      return reply.status(502).send({
        error: 'Re-embedding failed',
        message: err instanceof Error ? err.message : String(err),
      });
    }

    const embedRows = updatedSchema.columns.map((col, i) => ({
      columnName: col.columnName,
      embeddingText: buildColumnEmbeddingText(col),
      embedding: embeddingVectors[i]!,
    }));

    const client = await fastify.db.connect();
    try {
      await client.query('BEGIN');

      await client.query(`DELETE FROM schema_embeddings WHERE dataset_id = $1::uuid`, [datasetId]);

      await insertSchemaEmbeddings(client, datasetId, embedRows);

      const { rows } = await client.query<{
        id: string;
        updated_at: string;
      }>(
        `UPDATE semantic_states
         SET schema_json = $2::jsonb,
             understanding_card = $3,
             is_user_corrected = true,
             updated_at = NOW()
         WHERE dataset_id = $1::uuid
         RETURNING id, updated_at`,
        [
          datasetId,
          JSON.stringify(updatedSchema),
          updatedSchema.understandingCard ?? null,
        ],
      );

      await client.query('COMMIT');

      const row = rows[0]!;
      return reply.send({
        id: row.id,
        datasetId,
        schemaJson: updatedSchema,
        understandingCard: updatedSchema.understandingCard ?? null,
        isUserCorrected: true,
        updatedAt: row.updated_at,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      fastify.log.error({ err }, 'PATCH semantic transaction failed');
      throw err;
    } finally {
      client.release();
    }
  });

  // ── POST /api/datasets/upload ──────────────────────────────────────────────
  // multipart → parse → profile → enrich + embed → S3 → dynamic table → datasets + semantic + embeddings
  fastify.post('/datasets/upload', async (request, reply) => {
    // 1. Read the multipart file
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const filename = data.filename ?? 'upload.csv';

    // Reject non-CSV by extension and MIME type
    const isCSVExtension = filename.toLowerCase().endsWith('.csv');
    const isCSVMime = CSV_MIMETYPES.has(data.mimetype.toLowerCase());
    if (!isCSVExtension && !isCSVMime) {
      return reply.status(400).send({ error: 'Only CSV files are accepted' });
    }

    // 2. Read the full file into a buffer, enforcing the 50 MB limit
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    for await (const chunk of data.file) {
      totalBytes += chunk.length;
      if (totalBytes > MAX_FILE_SIZE) {
        return reply.status(413).send({ error: 'File exceeds the 50 MB limit' });
      }
      chunks.push(chunk as Buffer);
    }
    const fileBuffer = Buffer.concat(chunks);

    // 3. Parse CSV
    const csvText = fileBuffer.toString('utf8');
    const parsed = parseCSV(csvText);

    if (parsed.headers.length === 0) {
      return reply.status(400).send({ error: 'CSV has no headers' });
    }
    if (parsed.rows.length === 0) {
      return reply.status(400).send({ error: 'CSV has no data rows' });
    }

    // 4. Profile columns (type detection, null rates, samples, ranges)
    const profiles = profileColumns(parsed);

    // 5. Generate IDs
    const datasetId = randomUUID();
    const tableName = `dataset_${datasetId.replace(/-/g, '')}`;
    const s3Key = `uploads/${request.userId}/${datasetId}/${filename}`;

    // 6. Upload to S3 (before DB — orphaned S3 objects are acceptable)
    try {
      await uploadToS3(fastify.s3, s3Key, fileBuffer);
    } catch (err) {
      fastify.log.error({ err }, 'S3 upload failed');
      return reply.status(502).send({ error: 'File storage unavailable' });
    }

    // 7. Groq enrichment + HF embeddings (Phase 2C) — run before DDL so failed LLM calls leave no DB artifacts
    let enrichedColumns: ColumnProfile[];
    let understandingCard: string;
    let embeddingVectors: number[][];
    try {
      const enrichInput = profiles.map(profilerToEnricherInput);
      const enriched = await enrichProfilerColumns(enrichInput);
      enrichedColumns = mergeAllProfilerColumns(profiles, enriched);
      understandingCard = await generateUnderstandingCard(enriched, filename);
      const texts = enrichedColumns.map((col) => buildColumnEmbeddingText(col));
      embeddingVectors = await embedTextsBatched(texts);
      if (embeddingVectors.length !== enrichedColumns.length) {
        throw new Error('Embedding batch size mismatch');
      }
    } catch (err) {
      fastify.log.error({ err }, 'Semantic enrichment / embedding failed');
      return reply.status(502).send({
        error: 'Semantic enrichment failed',
        message: err instanceof Error ? err.message : String(err),
      });
    }

    const embedRows = enrichedColumns.map((col, i) => ({
      columnName: col.columnName,
      embeddingText: buildColumnEmbeddingText(col),
      embedding: embeddingVectors[i]!,
    }));

    const schemaJson: StoredSchemaJson = {
      tableName,
      columns: enrichedColumns,
      understandingCard,
    };

    // 8. DB transaction: CREATE dynamic table + bulk INSERT + datasets + semantic_states + schema_embeddings
    const client = await fastify.db.connect();
    try {
      await client.query('BEGIN');

      const columnDDL = profiles
        .map((p) => `${quotedIdent(p.columnName)} ${p.postgresType}`)
        .join(',\n  ');

      await client.query(`
        CREATE TABLE "${tableName}" (
          _row_id SERIAL PRIMARY KEY,
          ${columnDDL}
        )
      `);

      await client.query(`GRANT SELECT ON "${tableName}" TO readonly_agent`);

      await bulkInsertRows(client, tableName, profiles, parsed.rows);

      const datasetResult = await client.query<{
        id: string;
        name: string;
        row_count: number;
        column_count: number;
        is_demo: boolean;
        created_at: string;
      }>(
        `INSERT INTO datasets
           (id, user_id, name, s3_key, row_count, column_count, is_demo, data_table_name)
         VALUES ($1, $2, $3, $4, $5, $6, false, $7)
         RETURNING id, name, row_count, column_count, is_demo, created_at`,
        [
          datasetId,
          request.userId,
          filename,
          s3Key,
          parsed.rows.length,
          profiles.length,
          tableName,
        ],
      );

      const semanticResult = await client.query<{
        id: string;
        updated_at: string;
      }>(
        `INSERT INTO semantic_states (dataset_id, schema_json, understanding_card)
         VALUES ($1, $2::jsonb, $3)
         RETURNING id, updated_at`,
        [datasetId, JSON.stringify(schemaJson), understandingCard],
      );

      await insertSchemaEmbeddings(client, datasetId, embedRows);

      await client.query('COMMIT');

      const ds = datasetResult.rows[0];
      const ss = semanticResult.rows[0];

      return reply.send({
        dataset: {
          id: ds!.id,
          name: ds!.name,
          rowCount: ds!.row_count,
          columnCount: ds!.column_count,
          isDemo: ds!.is_demo,
          createdAt: ds!.created_at,
        },
        semanticState: {
          id: ss!.id,
          datasetId,
          schemaJson,
          understandingCard,
          isUserCorrected: false,
          updatedAt: ss!.updated_at,
        },
        understandingCard,
        piiSummary: {
          redactedColumns: [],
          totalRedactions: 0,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      fastify.log.error({ err }, 'Upload DB transaction failed');
      throw err;
    } finally {
      client.release();
    }
  });
}
