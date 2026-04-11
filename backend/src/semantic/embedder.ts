import type { Pool, PoolClient } from 'pg';
import pgvector from 'pgvector/pg';
import { env } from '../config/env.js';
import { hfPool } from '../ratelimit/keyPool.js';
import type { ColumnProfile } from './types.js';

const HF_INFERENCE = 'https://api-inference.huggingface.co/models';

/**
 * Step 5 (§5.3): text used for embedding each column.
 */
export function buildColumnEmbeddingText(profile: ColumnProfile): string {
  const samples = profile.sampleValues.slice(0, 5).join(', ');
  return `${profile.businessLabel}: ${profile.description}. Sample values: ${samples}`;
}

/**
 * Steps 5–6: HuggingFace `bge-small-en-v1.5` → 384-dim vectors (Backend_Master env `EMBEDDING_HF_MODEL`).
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const model = env.EMBEDDING_HF_MODEL;
  const url = `${HF_INFERENCE}/${encodeURIComponent(model)}`;
  const key = hfPool.next();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: texts }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HF embedding failed (${res.status}): ${errText.slice(0, 500)}`);
  }

  const data: unknown = await res.json();

  // Single input → number[]; batch → number[][]
  if (Array.isArray(data) && data.length > 0 && typeof (data as number[][])[0]?.[0] === 'number') {
    return data as number[][];
  }
  if (Array.isArray(data) && typeof (data as number[])[0] === 'number') {
    return [data as number[]];
  }
  // Some models wrap in { data: [...] }
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    const inner = (data as { data: number[][] }).data;
    return inner;
  }

  throw new Error('Unexpected HF embedding response shape');
}

/**
 * Step 7: insert rows into `schema_embeddings` (384-dim `vector`).
 */
export async function insertSchemaEmbeddings(
  pool: Pool,
  datasetId: string,
  rows: Array<{ columnName: string; embeddingText: string; embedding: number[] }>,
): Promise<void> {
  if (rows.length === 0) return;

  const client: PoolClient = await pool.connect();
  try {
    await pgvector.registerTypes(client);

    const insertSql = `
      INSERT INTO schema_embeddings (dataset_id, column_name, embedding_text, embedding)
      VALUES ($1::uuid, $2, $3, $4::vector)
    `;

    for (const row of rows) {
      if (row.embedding.length !== 384) {
        throw new Error(`Expected 384-dim embedding, got ${row.embedding.length}`);
      }
      await client.query(insertSql, [
        datasetId,
        row.columnName,
        row.embeddingText,
        pgvector.toSql(row.embedding),
      ]);
    }
  } finally {
    client.release();
  }
}
