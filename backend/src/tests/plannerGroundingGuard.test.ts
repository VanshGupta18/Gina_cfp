import assert from 'node:assert';
import { test } from 'node:test';
import {
  applyPlannerGroundingGuard,
  buildGroundingFallbackReply,
  DEFAULT_NOT_GROUNDED_REPLY,
} from '../pipeline/plannerGroundingGuard.js';
import type { PlannerOutput } from '../pipeline/planner.js';

const basePlan = (overrides: Partial<PlannerOutput>): PlannerOutput => ({
  intent: 'simple_query',
  relevantColumns: ['amount'],
  relevantTables: ['dataset_t1'],
  answerFromCache: false,
  cacheAnswer: null,
  conversationalReply: null,
  ...overrides,
});

const allowed = new Set(['amount', 'date', 'category']);

test('valid SQL intent and columns — unchanged', () => {
  const plan = basePlan({ relevantColumns: ['amount', 'date'], relevantTables: ['dataset_t1'] });
  const { plan: out, coerced } = applyPlannerGroundingGuard(plan, {
    tableName: 'dataset_t1',
    allowedColumnNames: allowed,
  });
  assert.strictEqual(coerced, false);
  assert.strictEqual(out.intent, 'simple_query');
});

test('unknown column — coerces to conversational', () => {
  const plan = basePlan({ relevantColumns: ['revenue'] });
  const { plan: out, coerced } = applyPlannerGroundingGuard(plan, {
    tableName: 'dataset_t1',
    allowedColumnNames: allowed,
  });
  assert.strictEqual(coerced, true);
  assert.strictEqual(out.intent, 'conversational');
  assert.deepStrictEqual(out.relevantColumns, []);
  assert.ok(out.conversationalReply?.includes(DEFAULT_NOT_GROUNDED_REPLY.slice(0, 20)));
});

test('empty relevantColumns with SQL intent — coerces', () => {
  const plan = basePlan({ relevantColumns: [] });
  const { plan: out, coerced } = applyPlannerGroundingGuard(plan, {
    tableName: 'dataset_t1',
    allowedColumnNames: allowed,
  });
  assert.strictEqual(coerced, true);
  assert.strictEqual(out.intent, 'conversational');
});

test('wrong table in relevantTables — coerces', () => {
  const plan = basePlan({
    relevantColumns: ['amount'],
    relevantTables: ['other_table'],
  });
  const { plan: out, coerced } = applyPlannerGroundingGuard(plan, {
    tableName: 'dataset_t1',
    allowedColumnNames: allowed,
  });
  assert.strictEqual(coerced, true);
  assert.strictEqual(out.intent, 'conversational');
});

test('conversational intent — pass through', () => {
  const plan = basePlan({
    intent: 'conversational',
    relevantColumns: [],
    relevantTables: [],
    conversationalReply: 'Hello',
  });
  const { plan: out, coerced } = applyPlannerGroundingGuard(plan, {
    tableName: 'dataset_t1',
    allowedColumnNames: allowed,
  });
  assert.strictEqual(coerced, false);
  assert.strictEqual(out.intent, 'conversational');
});

test('buildGroundingFallbackReply appends understanding card when short', () => {
  const s = buildGroundingFallbackReply('Sales by region.');
  assert.ok(s.includes('Sales by region'));
  assert.ok(s.includes(DEFAULT_NOT_GROUNDED_REPLY.slice(0, 30)));
});

test('planner conversationalReply preserved when coerced if set', () => {
  const plan = basePlan({
    relevantColumns: ['nope'],
    conversationalReply: 'Custom off-topic reply.',
  });
  const { plan: out, coerced } = applyPlannerGroundingGuard(plan, {
    tableName: 'dataset_t1',
    allowedColumnNames: allowed,
  });
  assert.strictEqual(coerced, true);
  assert.strictEqual(out.conversationalReply, 'Custom off-topic reply.');
});
