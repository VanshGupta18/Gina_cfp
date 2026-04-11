import { randomUUID } from 'crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ColumnProfile } from '../semantic/profiler.js';
import type { QueryResultPayload } from '../types/queryResultPayload.js';
import {
  getNarrationCache,
  narrationCacheKey,
  resultShapeFingerprint,
  storeNarrationCache,
} from '../cache/narrationCache.js';
import {
  getResponseCache,
  incrementResponseCacheHits,
  storeResponseCache,
} from '../cache/responseCache.js';
import { generateSql } from './sqlGenerator.js';
import { runPlanner } from './planner.js';
import { validateSql } from './sqlValidator.js';

export type { QueryResultPayload };

export type QueryOrchestrationInput = {
  fastify: FastifyInstance;
  reply: FastifyReply;
  userId: string;
  conversationId: string;
  datasetId: string;
  question: string;
  sessionContext: {
    recentExchanges: Array<{ question: string; answer: string }>;
    lastResultSet: unknown;
  };
};

function summarizeLastResultSet(last: unknown): string | null {
  if (last == null) return null;
  if (!Array.isArray(last)) return 'unknown shape';
  if (last.length === 0) return 'empty (0 rows)';
  const row = last[0] as Record<string, unknown>;
  const keys = Object.keys(row);
  return `yes, ${last.length} rows, columns: ${keys.slice(0, 12).join(', ')}${keys.length > 12 ? '…' : ''}`;
}

async function sendStep(reply: FastifyReply, payload: Record<string, unknown>): Promise<void> {
  await reply.sse.send({ event: 'step', data: payload });
}

async function sendResult(reply: FastifyReply, payload: QueryResultPayload): Promise<void> {
  await reply.sse.send({ event: 'result', data: payload });
}

async function sendError(reply: FastifyReply, message: string, recoverable: boolean): Promise<void> {
  await reply.sse.send({ event: 'error', data: { message, recoverable } });
}

function minimalTablePayload(
  rows: Record<string, unknown>[],
  citationChips: string[],
  sql: string,
  narrative: string,
): QueryResultPayload {
  return {
    messageId: randomUUID(),
    narrative,
    chartType: 'table',
    chartData: { labels: [], datasets: [] },
    keyFigure: rows.length === 0 ? '0' : String(rows.length),
    citationChips,
    sql,
    secondarySql: null,
    rowCount: rows.length,
    confidenceScore: 70,
    followUpSuggestions: [],
    autoInsights: [],
    cacheHit: false,
    snapshotUsed: false,
  };
}

/** Persist §5 response_cache; strip cacheHit so stored rows are always "miss" shape for TTL refresh. */
async function persistResponseCache(
  pool: FastifyInstance['db'],
  datasetId: string,
  question: string,
  payload: QueryResultPayload,
): Promise<void> {
  const toStore = { ...payload, cacheHit: false };
  await storeResponseCache(pool, datasetId, question, toStore);
}

/**
 * Phase 4 SSE + Phase 5 caches (Person B). Telemetry → Person A.
 */
export async function runQueryOrchestration(input: QueryOrchestrationInput): Promise<void> {
  const { fastify, reply, userId, datasetId, question, sessionContext } = input;

  const load = await fastify.db.query<{
    data_table_name: string;
    schema_json: unknown;
    understanding_card: string | null;
  }>(
    `SELECT d.data_table_name, ss.schema_json, ss.understanding_card
     FROM datasets d
     JOIN semantic_states ss ON ss.dataset_id = d.id
     WHERE d.id = $1::uuid AND d.user_id = $2::uuid`,
    [datasetId, userId],
  );

  if (load.rowCount === 0) {
    await sendError(reply, 'Dataset not found or no semantic state', false);
    reply.sse.close();
    return;
  }

  const cached = await getResponseCache(fastify.db, datasetId, question);
  if (cached) {
    await incrementResponseCacheHits(fastify.db, cached.cacheKey);
    await sendStep(reply, {
      step: 'cache_hit',
      status: 'complete',
      detail: 'Answer restored from cache',
      cacheType: 'response_cache',
    });
    const out: QueryResultPayload = {
      ...cached.payload,
      messageId: randomUUID(),
      cacheHit: true,
    };
    await sendResult(reply, out);
    reply.sse.close();
    return;
  }

  const row = load.rows[0]!;
  const schema = row.schema_json as {
    tableName?: string;
    columns?: ColumnProfile[];
    understandingCard?: string;
  };
  const columns = schema.columns ?? [];
  const tableName = row.data_table_name;
  const understandingCard =
    schema.understandingCard ?? row.understanding_card ?? undefined;

  const plannerColumns = columns.map((c) => ({
    columnName: c.columnName,
    businessLabel: c.businessLabel,
    semanticType: c.semanticType,
    description: c.description,
  }));

  try {
    await sendStep(reply, {
      step: 'planner',
      status: 'running',
      detail: 'Understanding your question…',
    });

    const plan = await runPlanner({
      question,
      columns: plannerColumns,
      understandingCard,
      sessionExchanges: sessionContext.recentExchanges.slice(-3),
      lastResultSetSummary: summarizeLastResultSet(sessionContext.lastResultSet),
    });

    await sendStep(reply, {
      step: 'planner',
      status: 'complete',
      detail: 'Identified intent and relevant columns',
      intent: plan.intent,
      relevantColumns: plan.relevantColumns,
    });

    if (plan.intent === 'conversational') {
      await sendStep(reply, { step: 'narration', status: 'running', detail: 'Writing your answer' });
      const text =
        plan.conversationalReply?.trim() ||
        "I'm here to help you explore this dataset. Ask a question about your data in plain English.";
      await sendStep(reply, { step: 'narration', status: 'complete', detail: 'Done' });
      const payload: QueryResultPayload = {
        messageId: randomUUID(),
        narrative: text,
        chartType: 'table',
        chartData: { labels: [], datasets: [] },
        keyFigure: '—',
        citationChips: [],
        sql: '',
        secondarySql: null,
        rowCount: 0,
        confidenceScore: 100,
        followUpSuggestions: [],
        autoInsights: [],
        cacheHit: false,
        snapshotUsed: false,
      };
      await sendResult(reply, payload);
      await persistResponseCache(fastify.db, datasetId, question, payload);
      reply.sse.close();
      return;
    }

    if (plan.intent === 'follow_up_cache' && plan.answerFromCache) {
      await sendStep(reply, { step: 'narration', status: 'running', detail: 'Writing your answer' });
      const cacheText =
        plan.cacheAnswer != null
          ? typeof plan.cacheAnswer === 'string'
            ? plan.cacheAnswer
            : JSON.stringify(plan.cacheAnswer)
          : 'Here is the follow-up based on your previous result.';
      await sendStep(reply, { step: 'narration', status: 'complete', detail: 'Done' });
      const payload: QueryResultPayload = {
        messageId: randomUUID(),
        narrative: cacheText,
        chartType: 'table',
        chartData: { labels: [], datasets: [] },
        keyFigure: '—',
        citationChips: plan.relevantColumns,
        sql: '',
        secondarySql: null,
        rowCount: 0,
        confidenceScore: 90,
        followUpSuggestions: [],
        autoInsights: [],
        cacheHit: true,
        snapshotUsed: false,
      };
      await sendResult(reply, payload);
      await persistResponseCache(fastify.db, datasetId, question, payload);
      reply.sse.close();
      return;
    }

    await sendStep(reply, {
      step: 'sql_generation',
      status: 'running',
      detail: 'Generating SQL query',
      sqlPath: 'ec2',
    });

    const gen = await generateSql({
      question,
      tableName,
      columns,
      metricDefinitions: '',
    });

    if (gen.path !== 'ec2') {
      await sendStep(reply, {
        step: 'sql_fallback',
        status: 'warning',
        detail: 'Using backup query method',
        originalPath: 'ec2',
        fallbackPath: gen.path,
      });
    }

    await sendStep(reply, {
      step: 'sql_generation',
      status: 'complete',
      detail: 'SQL ready',
      sqlPath: gen.path,
      sql: gen.sql,
    });

    const validation = validateSql(gen.sql, [tableName]);
    if (!validation.valid) {
      await sendError(reply, validation.reason, false);
      reply.sse.close();
      return;
    }

    await sendStep(reply, {
      step: 'db_execution',
      status: 'running',
      detail: 'Executing against your data',
    });

    const exec = await fastify.db.query<Record<string, unknown>>(gen.sql);
    const rows = exec.rows ?? [];

    await sendStep(reply, {
      step: 'db_execution',
      status: 'complete',
      detail: 'Query finished',
      rowsReturned: rows.length,
    });

    const fp = resultShapeFingerprint(rows, gen.sql);
    const narrKey = narrationCacheKey(plan.intent, fp);
    let narrative = await getNarrationCache(fastify.db, narrKey);

    await sendStep(reply, { step: 'narration', status: 'running', detail: 'Writing your answer' });
    if (narrative == null) {
      narrative =
        rows.length === 0
          ? 'No rows matched your question. Try broadening filters or asking a different question.'
          : `Retrieved ${rows.length} row${rows.length === 1 ? '' : 's'} for your question. (Narration polish: Person A)`;
      await storeNarrationCache(fastify.db, narrKey, narrative);
    }
    await sendStep(reply, { step: 'narration', status: 'complete', detail: 'Done' });

    const resultPayload = minimalTablePayload(rows, plan.relevantColumns, gen.sql, narrative);
    await sendResult(reply, resultPayload);
    await persistResponseCache(fastify.db, datasetId, question, resultPayload);
    reply.sse.close();
  } catch (e) {
    fastify.log.error({ err: e }, 'runQueryOrchestration');
    await sendError(
      reply,
      e instanceof Error ? e.message : 'Pipeline failed',
      false,
    );
    reply.sse.close();
  }
}
