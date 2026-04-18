import { env } from '../config/env.js';
import { runShieldAgentCsv, withTimeout } from './shieldAgent.js';
import { runShieldFallbackCsv } from './shieldFallback.js';
import type { PiiSheetResult } from './types.js';

/**
 * Run PII agent (Groq) with timeout, then fall back to deterministic heuristics if disabled or on failure.
 */
export async function runPiiForSheet(
  csv: string,
  sheetLabel: string,
  columnKeyPrefix: string,
): Promise<PiiSheetResult> {
  if (!env.PII_AGENT_DISABLED) {
    const agentResult = await withTimeout(
      runShieldAgentCsv(csv, sheetLabel, columnKeyPrefix),
      env.PII_AGENT_TIMEOUT_MS,
    );
    if (agentResult) {
      return agentResult;
    }
  }

  return runShieldFallbackCsv(csv, columnKeyPrefix);
}
