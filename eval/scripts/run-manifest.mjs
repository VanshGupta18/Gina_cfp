#!/usr/bin/env node
/**
 * Eval runner: uploads a fixture CSV (or uses EVAL_DATASET_ID), runs each manifest case
 * against POST /api/query (SSE), scores intent / columns / optional SQL / expected result.
 *
 * Does not run automatically — invoke when the API is up and TEST_JWT is set.
 *
 *   TEST_JWT=eyJ… BASE_URL=http://127.0.0.1:3001 \
 *     node eval/scripts/run-manifest.mjs eval/bundles/micro/manifest.json
 *
 * Env:
 *   TEST_JWT or EVAL_JWT (required)
 *   BASE_URL (default http://127.0.0.1:3001)
 *   EVAL_DATASET_ID — skip upload; use existing dataset id (UUID with hyphens).
 *     You may also pass the Postgres table name dataset_<32hex> or bare 32-char hex; it is normalized.
 *   EVAL_CHECK_INTENT=1 — enforce planner intent vs manifest for SQL cases (default: skip intent check for SQL)
 *   EVAL_CHECK_RELEVANT_COLUMNS=1 — enforce relevant_columns as subset of planner columns (default: skip)
 *   EVAL_DEFAULT_SCALAR_ABS_TOL — default abs tolerance for numeric scalars when manifest omits abs_tol (default 0.02)
 *   EVAL_DEFAULT_TABLE_ABS_TOL — default for numeric cells in table results (default 0.02)
 *
 * Flags:
 *   --dataset-id=<uuid>   Override EVAL_DATASET_ID
 *   --base-url=<url>      Override BASE_URL
 *   --check-sql           Score token overlap between gold_sql (after table substitution) and response SQL
 */

import { readFileSync, existsSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  DEFAULT_TABLE_ABS_TOL,
  relevantColumnsSubset,
  rowMatchesExpected,
  scalarOk,
} from '../lib/scoreHelpers.mjs';

const token = process.env.TEST_JWT ?? process.env.EVAL_JWT;

function parseArgs(argv) {
  const out = {
    manifestPath: null,
    datasetId: process.env.EVAL_DATASET_ID ?? null,
    baseUrl: process.env.BASE_URL ?? 'http://127.0.0.1:3001',
    checkSql: false,
  };
  for (const a of argv) {
    if (a === '--check-sql') out.checkSql = true;
    else if (a.startsWith('--dataset-id=')) out.datasetId = a.slice('--dataset-id='.length);
    else if (a.startsWith('--base-url=')) out.baseUrl = a.slice('--base-url='.length);
    else if (!a.startsWith('-')) out.manifestPath = a;
  }
  return out;
}

/**
 * API routes use `datasets.id` (UUID). Dynamic SQL tables are named `dataset_` + uuid without hyphens.
 * Accept either form so copy-paste from SQL or the UI does not break.
 */
function normalizeEvalDatasetId(raw) {
  const s = String(raw).trim();
  if (!s) return null;
  const uuidWithHyphens =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidWithHyphens.test(s)) return s.toLowerCase();

  let hex32 = null;
  const asTable = /^dataset_([0-9a-f]{32})$/i.exec(s);
  if (asTable) hex32 = asTable[1].toLowerCase();
  else if (/^[0-9a-f]{32}$/i.test(s)) hex32 = s.toLowerCase();

  if (hex32) {
    return `${hex32.slice(0, 8)}-${hex32.slice(8, 12)}-${hex32.slice(12, 16)}-${hex32.slice(16, 20)}-${hex32.slice(20)}`;
  }
  return s;
}

function fail(msg, detail) {
  console.error('eval/run-manifest:', msg);
  if (detail != null) console.error(detail);
  process.exit(1);
}

/** Parse SSE text into { event, data } where data is parsed JSON when possible. */
function parseSseEvents(raw) {
  /** @type {{ event: string; data: unknown }[]} */
  const events = [];
  const blocks = raw.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    let ev = 'message';
    const dataLines = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) ev = line.slice(6).trim();
      if (line.startsWith('data:')) dataLines.push(line.replace(/^data:\s?/, ''));
    }
    if (dataLines.length === 0) continue;
    const joined = dataLines.join('');
    try {
      events.push({ event: ev, data: JSON.parse(joined) });
    } catch {
      events.push({ event: ev, data: joined });
    }
  }
  return events;
}

function lastPlannerComplete(events) {
  const hits = events.filter(
    (e) =>
      e.event === 'step' &&
      e.data &&
      typeof e.data === 'object' &&
      e.data.step === 'planner' &&
      e.data.status === 'complete',
  );
  return hits.length ? hits[hits.length - 1].data : null;
}

function lastResultPayload(events) {
  const hits = events.filter((e) => e.event === 'result' && e.data && typeof e.data === 'object');
  return hits.length ? hits[hits.length - 1].data : null;
}

function hasErrorEvent(events) {
  return events.some((e) => e.event === 'error');
}

/** First numeric-looking scalar from API result payload (big_number, or first row cell). */
function extractScalarFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const ct = payload.chartType;
  const cd = payload.chartData;
  if (ct === 'big_number' && cd && typeof cd === 'object' && 'value' in cd) {
    const v = cd.value;
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
  }
  const rt = payload.resultTable;
  if (rt && Array.isArray(rt.rows) && rt.rows.length > 0) {
    const row = rt.rows[0];
    if (row && typeof row === 'object') {
      for (const k of Object.keys(row)) {
        const raw = row[k];
        if (raw === '' || raw == null) continue;
        const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[£,]/g, ''));
        if (!Number.isNaN(n)) return n;
      }
    }
  }
  return null;
}

function rowsFromResultTable(payload) {
  const rt = payload?.resultTable;
  if (!rt || !Array.isArray(rt.rows)) return [];
  return rt.rows.map((row) => {
    const o = {};
    if (row && typeof row === 'object') {
      for (const [k, v] of Object.entries(row)) {
        o[k] = v === null || v === undefined ? '' : String(v);
      }
    }
    return o;
  });
}

/**
 * Multiset match: each expected row must pair with a distinct actual row that matches on expected keys.
 * When orderMatters, compare row-by-row index (still only expected keys must match).
 */
function tableEquivalent(actualRows, expectedRows, orderMatters, tableAbsTol) {
  if (orderMatters) {
    if (actualRows.length !== expectedRows.length) return false;
    for (let i = 0; i < expectedRows.length; i++) {
      if (!rowMatchesExpected(actualRows[i], expectedRows[i], tableAbsTol)) return false;
    }
    return true;
  }
  if (actualRows.length < expectedRows.length) return false;
  const used = new Set();
  for (const er of expectedRows) {
    let found = -1;
    for (let i = 0; i < actualRows.length; i++) {
      if (used.has(i)) continue;
      if (rowMatchesExpected(actualRows[i], er, tableAbsTol)) {
        found = i;
        break;
      }
    }
    if (found < 0) return false;
    used.add(found);
  }
  return true;
}

function sqlTokens(s) {
  return s
    .toLowerCase()
    .replace(/"/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['select', 'from', 'where', 'and', 'the', 'for'].includes(w));
}

function sqlTokenJaccard(gold, actual) {
  const ga = new Set(sqlTokens(gold));
  const aa = new Set(sqlTokens(actual));
  let inter = 0;
  for (const x of ga) if (aa.has(x)) inter++;
  const union = ga.size + aa.size - inter;
  return union === 0 ? 0 : inter / union;
}

function substituteTableName(sql, placeholder, tableName) {
  if (!sql || !placeholder) return sql;
  return sql.split(placeholder).join(tableName);
}

function pickCsvPath(manifest, manifestDir) {
  /** @type {string | null} */
  let first = null;
  for (const c of manifest.cases ?? []) {
    const p = c.data?.csv_path;
    if (typeof p === 'string' && p.length > 0) {
      if (!first) first = p;
    }
  }
  if (!first) return null;
  return resolve(manifestDir, first);
}

async function postJson(url, headers, body) {
  return fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function ensureUser(base, authHeader) {
  const sync = await postJson(`${base}/api/users/sync`, { Authorization: authHeader }, {});
  if (!sync.ok) fail('users/sync failed', await sync.text());
}

async function uploadCsv(base, authHeader, csvPath, filename) {
  const buf = readFileSync(csvPath);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'text/csv' }), filename);
  const up = await fetch(`${base}/api/datasets/upload`, {
    method: 'POST',
    headers: { Authorization: authHeader },
    body: form,
  });
  if (!up.ok) fail(`upload ${up.status}`, await up.text());
  const uploaded = await up.json();
  const datasetId = uploaded.dataset?.id;
  if (!datasetId) fail('upload response missing dataset.id', JSON.stringify(uploaded, null, 2));
  return datasetId;
}

async function fetchSemantic(base, authHeader, datasetId) {
  const sem = await fetch(`${base}/api/datasets/${datasetId}/semantic`, {
    headers: { Authorization: authHeader },
  });
  if (!sem.ok) fail('GET semantic failed', await sem.text());
  const j = await sem.json();
  const tableName = j.schemaJson?.tableName;
  if (!tableName || typeof tableName !== 'string') {
    fail('semantic response missing schemaJson.tableName');
  }
  return { tableName };
}

async function createConversation(base, authHeader, datasetId) {
  const conv = await postJson(
    `${base}/api/datasets/${datasetId}/conversations`,
    { Authorization: authHeader },
    {},
  );
  if (!conv.ok) fail('create conversation', await conv.text());
  const { id } = await conv.json();
  return id;
}

async function runQuery(base, authHeader, conversationId, datasetId, question) {
  const body = {
    conversationId,
    datasetId,
    question,
    sessionContext: { recentExchanges: [], lastResultSet: null },
  };
  const res = await postJson(`${base}/api/query`, { Authorization: authHeader, Accept: 'text/event-stream' }, body);
  if (!res.ok) fail(`/api/query ${res.status}`, await res.text());
  return res.text();
}

async function main() {
  const checkIntentSql = process.env.EVAL_CHECK_INTENT === '1';
  const checkRelevantColumns = process.env.EVAL_CHECK_RELEVANT_COLUMNS === '1';

  const args = parseArgs(process.argv.slice(2));
  const manifestPath = args.manifestPath ? resolve(process.cwd(), args.manifestPath) : null;
  if (!manifestPath || !existsSync(manifestPath)) {
    fail(
      'Usage: node eval/scripts/run-manifest.mjs <path/to/manifest.json> [--dataset-id=] [--base-url=] [--check-sql]',
    );
  }
  if (!token) fail('Set TEST_JWT or EVAL_JWT');

  const manifestRaw = readFileSync(manifestPath, 'utf8');
  /** @type {any} */
  let manifest;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch (e) {
    fail(`invalid manifest JSON: ${e.message}`);
  }
  if (manifest.version !== '1' || !Array.isArray(manifest.cases)) fail('manifest must be version 1 with cases[]');

  const manifestDir = dirname(manifestPath);
  const base = args.baseUrl.replace(/\/$/, '');
  const authHeader = `Bearer ${token}`;

  const health = await fetch(`${base}/health`);
  if (!health.ok) fail(`/health ${health.status}`);

  await ensureUser(base, authHeader);

  const rawDatasetId = args.datasetId ? String(args.datasetId).trim() : '';
  let datasetId = rawDatasetId ? normalizeEvalDatasetId(rawDatasetId) : null;
  if (rawDatasetId && /^dataset_[0-9a-f]{32}$/i.test(rawDatasetId)) {
    console.error(`eval/run-manifest: resolved table name ${rawDatasetId} to dataset id ${datasetId}`);
  } else if (rawDatasetId && /^[0-9a-f]{32}$/i.test(rawDatasetId) && !rawDatasetId.includes('-')) {
    console.error(`eval/run-manifest: added hyphens to dataset id ${datasetId}`);
  }
  const csvResolved = pickCsvPath(manifest, manifestDir);

  if (!datasetId) {
    if (!csvResolved || !existsSync(csvResolved)) {
      fail(
        'No EVAL_DATASET_ID / --dataset-id and no case with data.csv_path pointing to a readable file. Provide a dataset or a fixture CSV.',
      );
    }
    const filename = `eval_${basename(csvResolved)}`;
    datasetId = await uploadCsv(base, authHeader, csvResolved, filename);
  }

  const { tableName } = await fetchSemantic(base, authHeader, datasetId);
  const conversationId = await createConversation(base, authHeader, datasetId);

  /** @type {any[]} */
  const caseReports = [];
  let failures = 0;

  for (const c of manifest.cases) {
    const id = c.id;
    const placeholder =
      (c.data?.table_placeholder && String(c.data.table_placeholder)) || 'dataset_<FIXTURE_TABLE>';
    const goldSubstituted =
      typeof c.expect?.gold_sql === 'string'
        ? substituteTableName(c.expect.gold_sql, placeholder, tableName)
        : null;

    let sseText;
    try {
      sseText = await runQuery(base, authHeader, conversationId, datasetId, c.question);
    } catch (e) {
      failures++;
      caseReports.push({
        id,
        ok: false,
        error: String(e?.message ?? e),
      });
      continue;
    }

    const events = parseSseEvents(sseText);
    if (hasErrorEvent(events)) {
      failures++;
      caseReports.push({
        id,
        ok: false,
        error: 'SSE contained event:error',
        sseTail: sseText.slice(-600),
      });
      continue;
    }

    const planner = lastPlannerComplete(events);
    const payload = lastResultPayload(events);
    const expect = c.expect;

    /** @type {Record<string, unknown>} */
    const checks = {};
    let ok = true;

    if (expect.intent === 'conversational') {
      if (!planner) {
        checks.intent = { pass: false, note: 'no planner complete step (cache path?)', expected: expect.intent };
        ok = false;
      } else {
        const match = planner.intent === expect.intent;
        checks.intent = { pass: match, expected: expect.intent, actual: planner.intent };
        if (!match) ok = false;
      }
      const nr = expect.result;
      if (nr.type === 'conversational' && nr.narrative_contains?.length) {
        const text = String(payload?.narrative ?? '');
        const subs = nr.narrative_contains.map((s) => ({
          substring: s,
          pass: text.toLowerCase().includes(String(s).toLowerCase()),
        }));
        checks.narrative_contains = subs;
        if (subs.some((x) => !x.pass)) ok = false;
      }
    } else {
      if (!planner) {
        checks.intent = { pass: false, note: 'no planner complete (response cache skipped planner?)', expected: expect.intent };
        ok = false;
      } else if (checkIntentSql) {
        const match = planner.intent === expect.intent;
        checks.intent = { pass: match, expected: expect.intent, actual: planner.intent };
        if (!match) ok = false;
      } else {
        checks.intent = {
          skipped: true,
          expected: expect.intent,
          actual: planner.intent,
          note: 'set EVAL_CHECK_INTENT=1 to fail on intent mismatch for SQL cases',
        };
      }

      if (expect.relevant_columns?.length) {
        const actualCols = planner?.relevantColumns;
        if (!checkRelevantColumns) {
          checks.relevant_columns = {
            skipped: true,
            expected: expect.relevant_columns,
            actual: actualCols ?? null,
            note: 'set EVAL_CHECK_RELEVANT_COLUMNS=1 to enforce (subset match)',
          };
        } else if (!Array.isArray(actualCols)) {
          checks.relevant_columns = {
            pass: false,
            expected: expect.relevant_columns,
            actual: actualCols ?? null,
            mode: 'subset',
          };
          ok = false;
        } else {
          const pass = relevantColumnsSubset(expect.relevant_columns, actualCols);
          checks.relevant_columns = {
            pass,
            expected: expect.relevant_columns,
            actual: actualCols,
            mode: 'subset',
          };
          if (!pass) ok = false;
        }
      }

      if (args.checkSql && goldSubstituted && payload?.sql) {
        const j = sqlTokenJaccard(goldSubstituted, String(payload.sql));
        checks.sql_jaccard = j;
        checks.sql = { pass: j >= 0.35, threshold: 0.35, note: 'token Jaccard vs gold_sql (heuristic)' };
        if (!checks.sql.pass) ok = false;
      }

      if (expect.result?.type === 'scalar') {
        const num = extractScalarFromPayload(payload);
        const pass = num != null && scalarOk(num, expect.result);
        checks.scalar = { pass, actual: num, expected: expect.result.value };
        if (!pass) ok = false;
      } else if (expect.result?.type === 'table') {
        const expPath = resolve(manifestDir, expect.result.path);
        const tableTol =
          expect.result.table_abs_tol !== undefined && expect.result.table_abs_tol !== null
            ? expect.result.table_abs_tol
            : DEFAULT_TABLE_ABS_TOL;
        if (!existsSync(expPath)) {
          checks.table = { pass: false, error: `missing expected file ${expect.result.path}` };
          ok = false;
        } else {
          const expectedRows = JSON.parse(readFileSync(expPath, 'utf8'));
          const actualRows = rowsFromResultTable(payload);
          const pass = tableEquivalent(
            actualRows,
            expectedRows,
            expect.result.row_order_matters === true,
            tableTol,
          );
          checks.table = {
            pass,
            expectedRowCount: expectedRows.length,
            actualRowCount: actualRows.length,
            table_abs_tol: tableTol,
          };
          if (!pass) ok = false;
        }
      }
    }

    if (!ok) failures++;
    caseReports.push({
      id,
      ok,
      question: c.question,
      checks,
      narrativePreview: payload?.narrative ? String(payload.narrative).slice(0, 200) : null,
    });
  }

  const report = {
    bundle: manifest.name,
    manifestPath: pathToFileURL(manifestPath).href,
    baseUrl: base,
    datasetId,
    tableName,
    conversationId,
    evalConfig: {
      checkIntentForSql: checkIntentSql,
      checkRelevantColumns,
    },
    passed: failures === 0,
    summary: { total: manifest.cases.length, failed: failures },
    cases: caseReports,
    ranAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
