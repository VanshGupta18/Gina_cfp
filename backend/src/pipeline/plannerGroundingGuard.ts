import type { PlannerOutput } from './planner.js';

/** User-facing reply when the planner chose SQL but could not be grounded in the schema. */
export const DEFAULT_NOT_GROUNDED_REPLY =
  "That doesn't line up with the columns in this dataset. Ask something about the fields in this sheet, or try a quick summary of what's here.";

export function buildGroundingFallbackReply(understandingCard?: string | null): string {
  const hint = understandingCard?.trim();
  if (hint && hint.length > 0 && hint.length < 400) {
    return `${DEFAULT_NOT_GROUNDED_REPLY} ${hint}`;
  }
  return DEFAULT_NOT_GROUNDED_REPLY;
}

export type GroundingGuardInput = {
  /** Physical table name for this dataset (e.g. dataset_abc). */
  tableName: string;
  /** Exact columnName values from ColumnProfile. */
  allowedColumnNames: ReadonlySet<string>;
  understandingCard?: string | null;
};

/**
 * If the planner returned SQL intents but relevant columns/tables are not grounded in the
 * actual schema, coerce to conversational so the orchestrator never runs SQL.
 */
export function applyPlannerGroundingGuard(
  plan: PlannerOutput,
  input: GroundingGuardInput,
): { plan: PlannerOutput; coerced: boolean } {
  if (plan.intent !== 'simple_query' && plan.intent !== 'complex_query') {
    return { plan, coerced: false };
  }

  const { tableName, allowedColumnNames, understandingCard } = input;

  const emptyColumns = plan.relevantColumns.length === 0;
  const unknownColumn = plan.relevantColumns.some((c) => !allowedColumnNames.has(c));

  const tablesOk =
    plan.relevantTables.length === 0 || plan.relevantTables.includes(tableName);

  if (!emptyColumns && !unknownColumn && tablesOk) {
    return { plan, coerced: false };
  }

  const reply =
    plan.conversationalReply?.trim() || buildGroundingFallbackReply(understandingCard);

  return {
    plan: {
      ...plan,
      intent: 'conversational',
      relevantColumns: [],
      relevantTables: [],
      answerFromCache: false,
      cacheAnswer: null,
      conversationalReply: reply,
    },
    coerced: true,
  };
}
