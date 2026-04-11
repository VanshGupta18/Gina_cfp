import Groq from 'groq-sdk';
import { env } from '../config/env.js';
import { groqPool, hfPool } from '../ratelimit/keyPool.js';
import { runGroqQueued } from '../ratelimit/queue.js';
import type { ColumnProfile } from '../semantic/profiler.js';
import { tryTemplateSql } from './sqlTemplates.js';
import { validateSql } from './sqlValidator.js';

export type SqlGenerationPath = 'ec2' | 'hf' | 'groq_maverick' | 'template';

export type GenerateSqlResult = {
  sql: string;
  path: SqlGenerationPath;
};

const HF_SQL_TIMEOUT_MS = 8000;
const GROQ_SQL_TIMEOUT_MS = 5000;

function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

function buildSqlCoderPrompt(params: {
  question: string;
  tableName: string;
  columns: ColumnProfile[];
  metricDefinitions: string;
}): string {
  const colLines = params.columns.map(
    (c) =>
      `${c.columnName} (${c.postgresType}) -- ${c.businessLabel}: ${c.description}`,
  );
  return `### Task
Generate a PostgreSQL SELECT query to answer the question.

### Database Schema
Table: ${params.tableName}
Columns:
${colLines.join('\n')}

### Metric Definitions
${params.metricDefinitions || 'None'}

### Constraints
- SELECT only. No INSERT, UPDATE, DELETE, DROP, CREATE, or DDL.
- Use exact column names from the schema above.
- Use parameterised-style literals (no $1 $2 — inline safe values only).
- Limit result rows to 100 maximum.
- Handle NULL values with COALESCE where appropriate.

### Question
${params.question}

### SQL`;
}

function extractSqlFromLooseText(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/SELECT[\s\S]+?;/i) ?? trimmed.match(/SELECT[\s\S]+$/i);
  if (m) {
    return m[0].replace(/;$/g, '').trim();
  }
  return trimmed;
}

function tryParseSqlField(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const r = obj as Record<string, unknown>;
  for (const k of ['sql', 'generated_sql', 'query', 'statement', 'output']) {
    const v = r[k];
    if (typeof v === 'string' && v.toLowerCase().includes('select')) {
      return extractSqlFromLooseText(v);
    }
  }
  return null;
}

async function tierEc2(prompt: string): Promise<string | null> {
  const url = env.SQLCODER_EC2_URL;
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, question: prompt }),
    },
    env.SQLCODER_EC2_TIMEOUT_MS,
  );
  if (!res.ok) return null;
  const text = await res.text();
  try {
    const j = JSON.parse(text) as unknown;
    const fromField = tryParseSqlField(j);
    if (fromField) return fromField;
  } catch {
    /* plain text */
  }
  if (text.toLowerCase().includes('select')) {
    return extractSqlFromLooseText(text);
  }
  return null;
}

async function tierHf(prompt: string): Promise<string | null> {
  const model = env.SQLCODER_HF_MODEL;
  const encodedModel = model.split('/').map(encodeURIComponent).join('/');
  const url = `https://router.huggingface.co/hf-inference/models/${encodedModel}`;
  const key = hfPool.next();
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 256 } }),
    },
    HF_SQL_TIMEOUT_MS,
  );
  if (!res.ok) return null;
  const data: unknown = await res.json();
  if (typeof data === 'string') {
    return extractSqlFromLooseText(data);
  }
  if (Array.isArray(data) && data[0] && typeof data[0] === 'object') {
    const row = data[0] as Record<string, unknown>;
    if (typeof row.generated_text === 'string') {
      return extractSqlFromLooseText(row.generated_text);
    }
  }
  if (data && typeof data === 'object') {
    const fromField = tryParseSqlField(data);
    if (fromField) return fromField;
  }
  return null;
}

async function tierGroqMaverick(prompt: string): Promise<string | null> {
  const work = runGroqQueued(() => {
    const groq = new Groq({ apiKey: groqPool.next() });
    return groq.chat.completions
      .create({
        model: env.GROQ_MODEL_SQL_FALLBACK,
        temperature: 0,
        max_tokens: 512,
        messages: [
          {
            role: 'system',
            content:
              'You output a single PostgreSQL SELECT statement only. No markdown, no explanation.',
          },
          { role: 'user', content: prompt },
        ],
      })
      .withResponse();
  });

  const completion = await Promise.race([
    work,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('groq_sql_timeout')), GROQ_SQL_TIMEOUT_MS),
    ),
  ]).catch(() => null);

  if (!completion) return null;

  const text = completion.choices[0]?.message?.content;
  if (!text) return null;
  return extractSqlFromLooseText(text);
}

/**
 * §6.2 — EC2 → HF → Groq Maverick → §6.4 templates. Validates after each tier.
 */
export async function generateSql(params: {
  question: string;
  tableName: string;
  columns: ColumnProfile[];
  metricDefinitions?: string;
}): Promise<GenerateSqlResult> {
  const { question, tableName, columns, metricDefinitions = '' } = params;
  const prompt = buildSqlCoderPrompt({ question, tableName, columns, metricDefinitions });
  const allowedTables = [tableName];

  const tryTier = (sql: string | null, path: SqlGenerationPath): GenerateSqlResult | null => {
    if (!sql) return null;
    const v = validateSql(sql, allowedTables);
    if (v.valid) {
      return { sql: sql.trim(), path };
    }
    return null;
  };

  const ec2 = await tierEc2(prompt);
  const a = tryTier(ec2, 'ec2');
  if (a) return a;

  const hf = await tierHf(prompt);
  const b = tryTier(hf, 'hf');
  if (b) return b;

  const gq = await tierGroqMaverick(prompt);
  const c = tryTier(gq, 'groq_maverick');
  if (c) return c;

  const tmpl = tryTemplateSql(question, tableName, columns);
  const d = tryTier(tmpl, 'template');
  if (d) return d;

  throw new Error(
    'SQL generation failed: all tiers exhausted or produced invalid SQL for this question/schema',
  );
}
