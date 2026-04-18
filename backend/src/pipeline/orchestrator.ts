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
import { generateSql, type SqlGenerationPath } from './sqlGenerator.js';
import { runPlanner } from './planner.js';
import { validateSql } from './sqlValidator.js';
import { executeReadOnlySql, type ResultRow } from './dbExecutor.js';
import { runSecondaryQuery } from './secondaryQuery.js';
import { detectAutoInsights, computeConfidence, selectChartType, type ChartType } from './autoInsight.js';
import {
  emptyResultExplanation,
  generateExplanation,
  generateNarration,
} from './narrator.js';
import { generateContextualFollowUps } from './followUpNarrator.js';
import { buildResultTable } from './resultTableSerialize.js';
import { getSnapshotMode } from '../snapshots/snapshotMode.js';
import {
  defaultSimulatedSteps,
  findMatchingSnapshot,
  SIMULATED_STEP_DELAY_MS,
} from '../snapshots/snapshotStore.js';
import { logPipelineRun, type PipelineRunInput } from '../telemetry/pipelineLogger.js';

export type { QueryResultPayload };

export { buildFollowUpSuggestions } from './followUpTemplates.js';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

/** Business labels for planner-chosen fields (plain-language “how we answered” text). */
function columnLabelsForExplanation(
  relevantNames: string[],
  schemaColumns: ColumnProfile[],
): string[] {
  return relevantNames.map((name) => {
    const c = schemaColumns.find((x) => x.columnName === name);
    const label = c?.businessLabel?.trim();
    return label && label.length > 0 ? label : name;
  });
}

// ─── Chart data helpers ───────────────────────────────────────────────────────

function firstNumericKey(rows: ResultRow[]): string | null {
  if (rows.length === 0) return null;
  return Object.keys(rows[0]!).find((k) => {
    const v = rows[0]![k];
    return typeof v === 'number' || (typeof v === 'string' && !isNaN(parseFloat(v)));
  }) ?? null;
}

function firstStringKey(rows: ResultRow[]): string | null {
  if (rows.length === 0) return null;
  return Object.keys(rows[0]!).find((k) => {
    const v = rows[0]![k];
    return typeof v === 'string' && isNaN(Number(v));
  }) ?? null;
}

function formatFigure(columnName: string, value: number): string {
  const lower = columnName.toLowerCase();
  const isMoney = ['amount', 'spend', 'revenue', 'cost', 'value', 'total', 'sum', 'price',
    'fee', 'grant', 'budget', 'awarded', 'donation', 'fund'].some((w) => lower.includes(w));
  const isPct = lower.includes('pct') || lower.includes('percent') || lower.includes('rate');

  if (isPct) return `${value.toFixed(1)}%`;
  if (isMoney) {
    if (Math.abs(value) >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `£${Math.round(value).toLocaleString('en-GB')}`;
    return `£${Math.abs(value) < 1 ? value.toFixed(2) : Math.round(value).toString()}`;
  }
  if (value % 1 === 0) return String(Math.round(value));
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function extractKeyFigure(rows: ResultRow[], chartType: ChartType): string {
  if (rows.length === 0) return '0';

  if (chartType === 'big_number') {
    const row = rows[0]!;
    const numKey = firstNumericKey([row]) ?? Object.keys(row)[0]!;
    const val = parseFloat(String(row[numKey]));
    return isNaN(val) ? String(row[numKey]) : formatFigure(numKey, val);
  }

  // Multi-row: sum the primary numeric column as the headline figure
  const numKey = firstNumericKey(rows);
  if (!numKey) return String(rows.length);
  const values = rows.map((r) => parseFloat(String(r[numKey] ?? 'NaN'))).filter((v) => !isNaN(v));
  const total = values.reduce((s, v) => s + v, 0);
  return formatFigure(numKey, total);
}

function buildChartData(
  rows: ResultRow[],
  chartType: ChartType,
): QueryResultPayload['chartData'] {
  if (chartType === 'big_number') {
    const row = rows[0] ?? {};
    const numKey = firstNumericKey([row]) ?? Object.keys(row)[0] ?? 'value';
    const val = parseFloat(String(row[numKey]));
    return { value: isNaN(val) ? 0 : val, label: String(numKey) };
  }

  if (rows.length === 0) return { labels: [], datasets: [] };

  const keys = Object.keys(rows[0]!);
  const labelKey = firstStringKey(rows) ?? keys[0]!;
  const numericKeys = keys.filter((k) => {
    const v = rows[0]![k];
    return typeof v === 'number' || (typeof v === 'string' && !isNaN(parseFloat(v)));
  });

  const labels = rows.map((r) => String(r[labelKey] ?? ''));

  if (numericKeys.length === 0) {
    return { labels, datasets: [{ label: 'count', data: rows.map((_, i) => i + 1) }] };
  }

  const datasets = numericKeys.map((k) => ({
    label: k,
    data: rows.map((r) => parseFloat(String(r[k] ?? '0')) || 0),
  }));

  return { labels, datasets };
}

function buildCitationChips(rows: ResultRow[], relevantColumns: string[]): string[] {
  if (rows.length === 0) return relevantColumns.slice(0, 5);
  const resultKeys = Object.keys(rows[0]!);
  // Prefer result keys that overlap with relevant columns, then any result keys
  const fromRelevant = relevantColumns.filter((c) =>
    resultKeys.some((k) => k.toLowerCase() === c.toLowerCase()),
  );
  const extra = resultKeys.filter((k) =>
    !fromRelevant.some((c) => c.toLowerCase() === k.toLowerCase()),
  );
  return [...fromRelevant, ...extra].slice(0, 5);
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

async function persistMessages(
  fastify: FastifyInstance,
  params: {
    conversationId: string;
    question: string;
    narrative: string;
    outputPayload: QueryResultPayload;
  },
): Promise<string> {
  const { conversationId, question, narrative, outputPayload } = params;

  // User message (no output_payload)
  await fastify.db.query(
    `INSERT INTO messages (id, conversation_id, role, content, output_payload)
     VALUES ($1::uuid, $2::uuid, 'user', $3, NULL)`,
    [randomUUID(), conversationId, question],
  );

  // Assistant message with full output_payload
  const assistantId = outputPayload.messageId;
  await fastify.db.query(
    `INSERT INTO messages (id, conversation_id, role, content, output_payload)
     VALUES ($1::uuid, $2::uuid, 'assistant', $3, $4::jsonb)`,
    [assistantId, conversationId, narrative, JSON.stringify(outputPayload)],
  );

  return assistantId;
}

async function setConversationTitle(
  fastify: FastifyInstance,
  conversationId: string,
  question: string,
): Promise<void> {
  const title = question.trim().slice(0, 60) + (question.trim().length > 60 ? '…' : '');
  await fastify.db.query(
    `UPDATE conversations SET title = $1, updated_at = NOW()
     WHERE id = $2::uuid AND title IS NULL`,
    [title, conversationId],
  );
}

/** §5 response_cache — stored payload always has cacheHit: false for TTL refresh. */
async function persistResponseCache(
  pool: FastifyInstance['db'],
  datasetId: string,
  question: string,
  payload: QueryResultPayload,
): Promise<void> {
  const toStore = { ...payload, cacheHit: false };
  await storeResponseCache(pool, datasetId, question, toStore);
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

/**
 * Phase 4 — Full pipeline orchestration.
 * Person B: SSE infrastructure, intent routing, SQL generation.
 * Person A: DB execution (readonly_agent), secondary query, auto-insights,
 *           narration, chart assembly, message persistence, conversation title.
 */
export async function runQueryOrchestration(input: QueryOrchestrationInput): Promise<void> {
  const { fastify, reply, userId, datasetId, question, sessionContext } = input;
  const t0 = Date.now();

  // ── Telemetry accumulator ──
  const tel: Partial<PipelineRunInput> & { conversationId: string } = {
    conversationId: input.conversationId,
    messageId: null,
    intent: null,
    latencyPlannerMs: null,
    latencySqlMs: null,
    latencyDbMs: null,
    latencyNarratorMs: null,
    sqlPath: null,
    sqlValid: null,
    rowsReturned: null,
    cacheHit: 'none',
    fallbackTriggered: false,
    fallbackStep: null,
    fallbackTarget: null,
    secondaryQueryFired: false,
    secondaryDimension: null,
    confidenceScore: null,
    snapshotUsed: false,
  };

  async function flushTelemetry(overrides: Partial<PipelineRunInput> = {}): Promise<void> {
    const run: PipelineRunInput = {
      conversationId: tel.conversationId,
      messageId: tel.messageId ?? null,
      intent: tel.intent ?? null,
      latencyTotalMs: Date.now() - t0,
      latencyPlannerMs: tel.latencyPlannerMs ?? null,
      latencySqlMs: tel.latencySqlMs ?? null,
      latencyDbMs: tel.latencyDbMs ?? null,
      latencyNarratorMs: tel.latencyNarratorMs ?? null,
      sqlPath: tel.sqlPath ?? null,
      sqlValid: tel.sqlValid ?? null,
      rowsReturned: tel.rowsReturned ?? null,
      cacheHit: tel.cacheHit ?? 'none',
      fallbackTriggered: tel.fallbackTriggered ?? false,
      fallbackStep: tel.fallbackStep ?? null,
      fallbackTarget: tel.fallbackTarget ?? null,
      secondaryQueryFired: tel.secondaryQueryFired ?? false,
      secondaryDimension: tel.secondaryDimension ?? null,
      confidenceScore: tel.confidenceScore ?? null,
      snapshotUsed: tel.snapshotUsed ?? false,
      ...overrides,
    };
    try {
      await logPipelineRun(fastify.db, run);
    } catch (e) {
      fastify.log.error({ err: e }, 'logPipelineRun failed (non-fatal)');
    }
  }

  const load = await fastify.db.query<{
    data_table_name: string;
    demo_slug: string | null;
    schema_json: unknown;
    understanding_card: string | null;
  }>(
    `SELECT d.data_table_name, d.demo_slug, ss.schema_json, ss.understanding_card
     FROM datasets d
     JOIN semantic_states ss ON ss.dataset_id = d.id
     WHERE d.id = $1::uuid AND (d.user_id = $2::uuid OR d.is_demo = true)`,
    [datasetId, userId],
  );

  if (load.rowCount === 0) {
    await sendError(reply, 'Dataset not found or no semantic state', false);
    reply.sse.close();
    return;
  }

  // Phase 6 — demo snapshots (bypass pipeline; Person A fills JSON under backend/snapshots/)
  if (getSnapshotMode()) {
    const snap = findMatchingSnapshot(load.rows[0]!.demo_slug, question);
    if (snap) {
      const steps =
        snap.simulatedSteps && snap.simulatedSteps.length > 0
          ? snap.simulatedSteps
          : defaultSimulatedSteps(snap.outputPayload.rowCount);
      for (const data of steps) {
        await sendStep(reply, data as Record<string, unknown>);
        await delay(SIMULATED_STEP_DELAY_MS);
      }
      const out: QueryResultPayload = {
        ...snap.outputPayload,
        messageId: randomUUID(),
        snapshotUsed: true,
        cacheHit: false,
        explanation: snap.outputPayload.explanation ?? '',
        resultTable: snap.outputPayload.resultTable ?? null,
        resultTruncated: snap.outputPayload.resultTruncated ?? false,
        totalTimeMs: Date.now() - t0,
      };
      await sendResult(reply, out);
      reply.sse.close();
      let snapshotMsgId: string | null = null;
      try {
        snapshotMsgId = await persistMessages(fastify, {
          conversationId: input.conversationId,
          question,
          narrative: out.narrative,
          outputPayload: out,
        });
        await setConversationTitle(fastify, input.conversationId, question);
      } catch (e) {
        fastify.log.error({ err: e }, 'persistMessages snapshot');
      }
      await flushTelemetry({
        messageId: snapshotMsgId ?? out.messageId,
        snapshotUsed: true,
        cacheHit: 'none',
        rowsReturned: out.rowCount,
        confidenceScore: out.confidenceScore,
      });
      return;
    }
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
      explanation: cached.payload.explanation ?? '',
      resultTable: cached.payload.resultTable ?? null,
      resultTruncated: cached.payload.resultTruncated ?? false,
      totalTimeMs: Date.now() - t0,
    };
    await sendResult(reply, out);
    reply.sse.close();
    let persistedMsgId: string | null = null;
    try {
      persistedMsgId = await persistMessages(fastify, {
        conversationId: input.conversationId,
        question,
        narrative: out.narrative,
        outputPayload: out,
      });
      await setConversationTitle(fastify, input.conversationId, question);
    } catch (e) {
      fastify.log.error({ err: e }, 'persistMessages response_cache hit');
    }
    await flushTelemetry({
      messageId: persistedMsgId ?? out.messageId,
      intent: out.chartType === 'table' ? 'conversational' : 'simple_query',
      cacheHit: 'response_cache',
      rowsReturned: out.rowCount,
      confidenceScore: out.confidenceScore,
      snapshotUsed: false,
    });
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

    const tPlannerStart = Date.now();
    const plan = await runPlanner({
      question,
      columns: plannerColumns,
      understandingCard,
      sessionExchanges: sessionContext.recentExchanges.slice(-3),
      lastResultSetSummary: summarizeLastResultSet(sessionContext.lastResultSet),
    });
    tel.latencyPlannerMs = Date.now() - tPlannerStart;
    tel.intent = plan.intent;

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
      const followUpSuggestions = await generateContextualFollowUps({
        question,
        narrative: text,
        understandingCard: understandingCard ?? '',
        columns,
        relevantColumns: plan.relevantColumns,
        intent: plan.intent,
        rowCount: 0,
      });
      const conversationalPayload: QueryResultPayload = {
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
        followUpSuggestions,
        autoInsights: [],
        cacheHit: false,
        snapshotUsed: false,
        explanation: '',
        resultTable: null,
        resultTruncated: false,
        totalTimeMs: Date.now() - t0,
      };
      await sendResult(reply, conversationalPayload);
      reply.sse.close();
      try {
        await persistMessages(fastify, {
          conversationId: input.conversationId,
          question,
          narrative: text,
          outputPayload: conversationalPayload,
        });
        await setConversationTitle(fastify, input.conversationId, question);
      } catch (e) {
        fastify.log.error({ err: e }, 'persistMessages conversational');
      }
      try {
        await persistResponseCache(fastify.db, datasetId, question, conversationalPayload);
      } catch (e) {
        fastify.log.error({ err: e }, 'persistResponseCache conversational');
      }
      await flushTelemetry({
        messageId: conversationalPayload.messageId,
        rowsReturned: 0,
        confidenceScore: 100,
        cacheHit: 'none',
      });
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
      const followUpSuggestions = await generateContextualFollowUps({
        question,
        narrative: cacheText,
        understandingCard: understandingCard ?? '',
        columns,
        relevantColumns: plan.relevantColumns,
        intent: plan.intent,
        rowCount: 0,
      });
      const followUpPayload: QueryResultPayload = {
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
        followUpSuggestions,
        autoInsights: [],
        cacheHit: true,
        snapshotUsed: false,
        explanation: '',
        resultTable: null,
        resultTruncated: false,
        totalTimeMs: Date.now() - t0,
      };
      await sendResult(reply, followUpPayload);
      reply.sse.close();
      try {
        await persistMessages(fastify, {
          conversationId: input.conversationId,
          question,
          narrative: cacheText,
          outputPayload: followUpPayload,
        });
        await setConversationTitle(fastify, input.conversationId, question);
      } catch (e) {
        fastify.log.error({ err: e }, 'persistMessages follow_up_cache');
      }
      try {
        await persistResponseCache(fastify.db, datasetId, question, followUpPayload);
      } catch (e) {
        fastify.log.error({ err: e }, 'persistResponseCache follow_up_cache');
      }
      await flushTelemetry({
        messageId: followUpPayload.messageId,
        rowsReturned: 0,
        confidenceScore: 90,
        cacheHit: 'none',
      });
      return;
    }

    const preferredSqlPath: SqlGenerationPath =
      plan.intent === 'complex_query' ? 'hf' : 'groq_maverick';

    await sendStep(reply, {
      step: 'sql_generation',
      status: 'running',
      detail: 'Generating SQL query',
      sqlPath: preferredSqlPath,
    });

    const tSqlStart = Date.now();
    const gen = await generateSql({
      question,
      tableName,
      columns,
      metricDefinitions: '',
      sqlTierMode: plan.intent === 'complex_query' ? 'complex' : 'simple',
    });
    tel.latencySqlMs = Date.now() - tSqlStart;
    tel.sqlPath = gen.path;

    if (gen.path !== preferredSqlPath) {
      tel.fallbackTriggered = true;
      tel.fallbackStep = 'sql_generation';
      tel.fallbackTarget = gen.path;
      await sendStep(reply, {
        step: 'sql_fallback',
        status: 'warning',
        detail: 'Using backup query method',
        originalPath: preferredSqlPath,
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
    tel.sqlValid = validation.valid;
    if (!validation.valid) {
      await sendError(reply, validation.reason, false);
      reply.sse.close();
      await flushTelemetry();
      return;
    }

    await sendStep(reply, {
      step: 'db_execution',
      status: 'running',
      detail: 'Executing against your data',
    });

    // ── Person A: execute via readonly_agent role ──
    const tDbStart = Date.now();
    const exec = await executeReadOnlySql(fastify.db, gen.sql);
    tel.latencyDbMs = Date.now() - tDbStart;
    const rows = exec.rows;
    tel.rowsReturned = rows.length;
    const resultTable = buildResultTable(rows, columns, plan.relevantColumns);

    await sendStep(reply, {
      step: 'db_execution',
      status: 'complete',
      detail: 'Query finished',
      rowsReturned: rows.length,
      truncated: exec.truncated,
    });

    // ── Person A: secondary query (§6.5) ──
    const secondaryResult = await runSecondaryQuery({
      pool: fastify.db,
      question,
      tableName,
      columns,
      primaryRows: rows,
    });

    if (secondaryResult.fired) {
      tel.secondaryQueryFired = true;
      tel.secondaryDimension = null; // dimension not exposed by secondaryQuery.ts yet
      await sendStep(reply, {
        step: 'secondary_query',
        status: 'running',
        detail: 'Digging deeper into what drove the change',
      });
    }

    // ── Person A: auto insights + confidence (§6.7 / §6.8) ──
    const autoInsights = detectAutoInsights(rows, columns);
    const confidenceScore = computeConfidence(rows, gen.path, columns);
    tel.confidenceScore = confidenceScore;

    // ── Person A: chart type (§9) ──
    const chartType = selectChartType(rows, plan.intent, question);
    const keyFigure = extractKeyFigure(rows, chartType);

    const shapeFp = resultShapeFingerprint(rows, gen.sql);
    const narrCacheKey = narrationCacheKey(plan.intent, shapeFp);

    // ── Person A: narration (§6.6) + §5 narration_cache before narrator when possible ──
    await sendStep(reply, { step: 'narration', status: 'running', detail: 'Writing your answer' });
    let narrative: string;
    let narrationCacheHit = false;

    const tNarrStart = Date.now();
    if (!secondaryResult.fired) {
      const cachedNarr = await getNarrationCache(fastify.db, narrCacheKey);
      if (cachedNarr != null) {
        narrative = cachedNarr;
        narrationCacheHit = true;
      } else if (rows.length === 0) {
        narrative =
          'No rows matched your question. Try broadening your filters or rephrasing the question.';
        await storeNarrationCache(fastify.db, narrCacheKey, narrative);
      } else {
        narrative = await generateNarration({
          question,
          understandingCard: understandingCard ?? '',
          primaryRows: rows,
          secondaryRows: undefined,
          autoInsights,
        });
        await storeNarrationCache(fastify.db, narrCacheKey, narrative);
      }
    } else if (rows.length === 0) {
      narrative =
        'No rows matched your question. Try broadening your filters or rephrasing the question.';
    } else {
      narrative = await generateNarration({
        question,
        understandingCard: understandingCard ?? '',
        primaryRows: rows,
        secondaryRows: secondaryResult.rows,
        autoInsights,
      });
    }
    tel.latencyNarratorMs = Date.now() - tNarrStart;
    if (narrationCacheHit) {
      tel.cacheHit = 'narration_cache';
    }
    await sendStep(reply, { step: 'narration', status: 'complete', detail: 'Done' });

    const followUpBase = {
      question,
      narrative,
      understandingCard: understandingCard ?? '',
      columns,
      relevantColumns: plan.relevantColumns,
      intent: plan.intent,
      rowCount: rows.length,
      sql: gen.sql,
      keyFigure,
      sampleRows: rows,
    };

    const explanationLabels = columnLabelsForExplanation(plan.relevantColumns, columns);

    let explanation = '';
    let followUpSuggestions: string[] = [];

    if (rows.length === 0) {
      explanation = emptyResultExplanation({
        question,
        relevantColumns: plan.relevantColumns,
        columnLabels: explanationLabels,
      });
      followUpSuggestions = await generateContextualFollowUps(followUpBase);
    } else if (!narrationCacheHit) {
      [explanation, followUpSuggestions] = await Promise.all([
        generateExplanation({
          question,
          understandingCard: understandingCard ?? '',
          relevantColumns: plan.relevantColumns,
          columnLabels: explanationLabels,
          narrative,
          primaryRows: rows,
          sql: gen.sql,
        }),
        generateContextualFollowUps(followUpBase),
      ]);
    } else {
      followUpSuggestions = await generateContextualFollowUps(followUpBase);
    }

    // ── Person A: output payload assembly ──
    const chartData = buildChartData(rows, chartType);
    const citationChips = buildCitationChips(rows, plan.relevantColumns);

    const messageId = randomUUID();
    const outputPayload: QueryResultPayload = {
      messageId,
      narrative,
      chartType,
      chartData,
      keyFigure,
      citationChips,
      sql: gen.sql,
      secondarySql: secondaryResult.sql,
      rowCount: rows.length,
      confidenceScore,
      followUpSuggestions,
      autoInsights,
      cacheHit: false,
      snapshotUsed: false,
      explanation,
      resultTable,
      resultTruncated: exec.truncated,
      totalTimeMs: Date.now() - t0,
    };

    await sendResult(reply, outputPayload);
    reply.sse.close();

    // ── Person A: persist messages + set title (after SSE close for speed) ──
    try {
      await persistMessages(fastify, {
        conversationId: input.conversationId,
        question,
        narrative,
        outputPayload,
      });
      await setConversationTitle(fastify, input.conversationId, question);
    } catch (persistErr) {
      fastify.log.error({ err: persistErr }, 'Failed to persist messages');
    }
    try {
      await persistResponseCache(fastify.db, datasetId, question, outputPayload);
    } catch (cacheErr) {
      fastify.log.error({ err: cacheErr }, 'persistResponseCache sql path');
    }
    await flushTelemetry({ messageId });
  } catch (e) {
    fastify.log.error({ err: e }, 'runQueryOrchestration');
    await sendError(
      reply,
      e instanceof Error ? e.message : 'Pipeline failed',
      false,
    );
    reply.sse.close();
    await flushTelemetry();
  }
}
