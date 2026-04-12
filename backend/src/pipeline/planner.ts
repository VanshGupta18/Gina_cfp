import Groq from 'groq-sdk';
import { z } from 'zod';
import { env } from '../config/env.js';
import { groqPool } from '../ratelimit/keyPool.js';
import { runGroqQueued } from '../ratelimit/queue.js';

const plannerOutputSchema = z.object({
  intent: z.enum(['conversational', 'simple_query', 'complex_query', 'follow_up_cache']),
  relevantColumns: z.array(z.string()),
  relevantTables: z.array(z.string()),
  answerFromCache: z.boolean(),
  cacheAnswer: z.unknown().nullable(),
  conversationalReply: z.string().nullable().optional(),
});

export type PlannerIntent = z.infer<typeof plannerOutputSchema>['intent'];

export type PlannerInput = {
  question: string;
  /** Compact column view for the model (from semantic `schema_json.columns`). */
  columns: Array<{
    columnName: string;
    businessLabel: string;
    semanticType: string;
    description: string;
  }>;
  understandingCard?: string;
  /** Last few Q/A pairs (most recent last). */
  sessionExchanges?: Array<{ question: string; answer: string }>;
  /** Short summary e.g. "yes, 12 rows, 3 numeric columns" or null */
  lastResultSetSummary?: string | null;
};

export type PlannerOutput = z.infer<typeof plannerOutputSchema>;

/**
 * §6.1 — Groq Scout: intent + relevant columns/tables in one JSON call.
 */
export async function runPlanner(input: PlannerInput): Promise<PlannerOutput> {
  const recent = (input.sessionExchanges ?? []).slice(-3);
  const contextBlock =
    recent.length > 0
      ? recent.map((e) => `Q: ${e.question}\nA: ${e.answer}`).join('\n---\n')
      : '(none)';

  const lastRs = input.lastResultSetSummary ?? 'no';

  const system = `You are a data query planner. Given a user question and dataset schema, return a JSON object with intent classification and relevant columns.

Return JSON only (no markdown) with this shape:
{
  "intent": "conversational" | "simple_query" | "complex_query" | "follow_up_cache",
  "relevantColumns": ["col1"],
  "relevantTables": ["table_name"],
  "answerFromCache": false,
  "cacheAnswer": null,
  "conversationalReply": null
}

Rules:
- intent "conversational" for hi, thanks, what can you do, off-topic — set relevantColumns to [] and relevantTables to []. Optionally set conversationalReply to a short helpful reply.
- "follow_up_cache" only when the user refers to the immediately previous tabular result and it can be answered without new SQL; set answerFromCache and cacheAnswer appropriately.
- "simple_query" vs "complex_query": use simple for single aggregation/filter/ranking; complex for multi-step or vague analysis.
- relevantColumns: raw column names from the schema that matter for SQL.
- relevantTables: physical dataset table name(s) from context (e.g. dataset_xxx).

Schema columns:
${JSON.stringify(input.columns, null, 2)}

Dataset summary (understanding card):
${input.understandingCard ?? '(none)'}`;

  const user = `Recent session context:\n${contextBlock}\n\nLast result set available: ${lastRs}\n\nUser question:\n${input.question}`;

  const completion = await runGroqQueued(() => {
    const groq = new Groq({ apiKey: groqPool.next() });
    return groq.chat.completions
      .create({
        model: env.GROQ_MODEL_PLANNER,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      })
      .withResponse();
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error('Planner returned empty content');
  }

  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch {
    throw new Error('Planner returned non-JSON');
  }

  const parsed = plannerOutputSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Planner JSON invalid: ${parsed.error.message}`);
  }

  return parsed.data;
}
