import { randomUUID } from 'crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ColumnProfile } from '../semantic/profiler.js';
import type { PlannerIntent } from './planner.js';
import { generateSql } from './sqlGenerator.js';
import { runPlanner } from './planner.js';
import { validateSql } from './sqlValidator.js';
import { executeReadOnlySql, type ResultRow } from './dbExecutor.js';
import { runSecondaryQuery } from './secondaryQuery.js';
import { detectAutoInsights, computeConfidence, selectChartType, type ChartType } from './autoInsight.js';
import { generateNarration } from './narrator.js';

/** §9 OutputPayload — Person A will enrich assembly; B emits a minimal valid shape. */
export type QueryResultPayload = {
  messageId: string;
  narrative: string;
  chartType: 'bar' | 'line' | 'big_number' | 'grouped_bar' | 'stacked_bar' | 'table';
  chartData:
    | {
        labels: string[];
        datasets: Array<{ label: string; data: number[] }>;
      }
    | { value: number; label: string };
  keyFigure: string;
  citationChips: string[];
  sql: string;
  secondarySql: string | null;
  rowCount: number;
  confidenceScore: number;
  followUpSuggestions: string[];
  autoInsights: string[];
  cacheHit: boolean;
  snapshotUsed: boolean;
};

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

function buildFollowUpSuggestions(columns: ColumnProfile[], intent: PlannerIntent | undefined): string[] {
  const suggestions: string[] = [];
  const hasDate = columns.some((c) => c.semanticType === 'date');
  const hasCategory = columns.some((c) => c.semanticType === 'category');
  const hasAmount = columns.some((c) => c.semanticType === 'amount');
  const catCol = columns.find((c) => c.semanticType === 'category');
  const amtCol = columns.find((c) => c.semanticType === 'amount');

  if (hasDate && hasAmount) {
    suggestions.push(
      `How has ${amtCol?.businessLabel ?? 'spending'} changed month over month?`,
    );
  }
  if (hasCategory && hasAmount) {
    suggestions.push(
      `Which ${catCol?.businessLabel ?? 'category'} has the highest ${amtCol?.businessLabel ?? 'total'}?`,
    );
  }
  if (hasCategory && hasAmount && hasDate) {
    suggestions.push(
      `Compare ${amtCol?.businessLabel ?? 'spending'} across ${catCol?.businessLabel ?? 'categories'} this year.`,
    );
  }
  if (suggestions.length < 3 && hasAmount) {
    suggestions.push(`What is the average ${amtCol?.businessLabel ?? 'amount'}?`);
  }
  if (suggestions.length < 3 && hasCategory) {
    suggestions.push(`How many unique ${catCol?.businessLabel ?? 'categories'} are there in total?`);
  }
  if (suggestions.length < 3) {
    suggestions.push('Show me the top 5 rows by value.');
  }
  if (suggestions.length < 3) {
    suggestions.push('What is the total count of records?');
  }
  void intent;
  return suggestions.slice(0, 3);
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

// ─── Main orchestrator ────────────────────────────────────────────────────────

/**
 * Phase 4 — Full pipeline orchestration.
 * Person B: SSE infrastructure, intent routing, SQL generation.
 * Person A: DB execution (readonly_agent), secondary query, auto-insights,
 *           narration, chart assembly, message persistence, conversation title.
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
     WHERE d.id = $1::uuid AND (d.user_id = $2::uuid OR d.is_demo = true)`,
    [datasetId, userId],
  );

  if (load.rowCount === 0) {
    await sendError(reply, 'Dataset not found or no semantic state', false);
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
        followUpSuggestions: buildFollowUpSuggestions(columns, plan.intent),
        autoInsights: [],
        cacheHit: false,
        snapshotUsed: false,
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
        followUpSuggestions: buildFollowUpSuggestions(columns, plan.intent),
        autoInsights: [],
        cacheHit: true,
        snapshotUsed: false,
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

    // ── Person A: execute via readonly_agent role ──
    const exec = await executeReadOnlySql(fastify.db, gen.sql);
    const rows = exec.rows;

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
      await sendStep(reply, {
        step: 'secondary_query',
        status: 'running',
        detail: 'Digging deeper into what drove the change',
      });
    }

    // ── Person A: auto insights + confidence (§6.7 / §6.8) ──
    const autoInsights = detectAutoInsights(rows, columns);
    const confidenceScore = computeConfidence(rows, gen.path, columns);

    // ── Person A: chart type (§9) ──
    const chartType = selectChartType(rows, plan.intent, question);

    // ── Person A: narration (§6.6) ──
    await sendStep(reply, { step: 'narration', status: 'running', detail: 'Writing your answer' });
    let narrative: string;
    if (rows.length === 0) {
      narrative =
        'No rows matched your question. Try broadening your filters or rephrasing the question.';
    } else {
      narrative = await generateNarration({
        question,
        understandingCard: understandingCard ?? '',
        primaryRows: rows,
        secondaryRows: secondaryResult.fired ? secondaryResult.rows : undefined,
        autoInsights,
      });
    }
    await sendStep(reply, { step: 'narration', status: 'complete', detail: 'Done' });

    // ── Person A: output payload assembly ──
    const chartData = buildChartData(rows, chartType);
    const keyFigure = extractKeyFigure(rows, chartType);
    const citationChips = buildCitationChips(rows, plan.relevantColumns);
    const followUpSuggestions = buildFollowUpSuggestions(columns, plan.intent);

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
