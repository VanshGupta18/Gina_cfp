/**
 * Shared scoring helpers for run-manifest (and tests).
 * Default numeric tolerances match eval/README.md.
 */

export const DEFAULT_SCALAR_ABS_TOL = Number.parseFloat(
  process.env.EVAL_DEFAULT_SCALAR_ABS_TOL ?? '0.02',
);
export const DEFAULT_TABLE_ABS_TOL = Number.parseFloat(
  process.env.EVAL_DEFAULT_TABLE_ABS_TOL ?? '0.02',
);

export function sameNumber(a, b, absTol = 0, relTol = 0) {
  const d = Math.abs(a - b);
  if (d <= absTol) return true;
  if (relTol > 0 && Math.abs(b) > 1e-12 && d / Math.abs(b) <= relTol) return true;
  return false;
}

export function parseNumericCell(s) {
  const t = String(s ?? '').trim().replace(/[$£€,]/g, '');
  if (t === '') return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {string|number} actualStr
 * @param {string|number} expectedStr
 * @param {number} tableAbsTol
 */
export function cellMatches(actualStr, expectedStr, tableAbsTol) {
  const a = typeof actualStr === 'number' ? actualStr : parseNumericCell(actualStr);
  const e = typeof expectedStr === 'number' ? expectedStr : parseNumericCell(expectedStr);
  if (a !== null && e !== null) {
    return sameNumber(a, e, tableAbsTol, 0);
  }
  return String(actualStr ?? '').trim() === String(expectedStr ?? '').trim();
}

/**
 * Compare cells for keys present in the expected row only (API may return extra columns).
 * @param {Record<string, string>} actual
 * @param {Record<string, unknown>} expected
 * @param {number} tableAbsTol
 */
export function rowMatchesExpected(actual, expected, tableAbsTol) {
  for (const k of Object.keys(expected)) {
    if (!cellMatches(actual?.[k], expected[k], tableAbsTol)) return false;
  }
  return true;
}

/**
 * @param {number} actual
 * @param {{ value: unknown; abs_tol?: number; rel_tol?: number }} expect
 */
export function scalarOk(actual, expect) {
  const v = expect.value;
  if (typeof v === 'number') {
    const abs =
      expect.abs_tol !== undefined && expect.abs_tol !== null ? expect.abs_tol : DEFAULT_SCALAR_ABS_TOL;
    const rel = expect.rel_tol ?? 0;
    return sameNumber(actual, v, abs, rel);
  }
  if (typeof v === 'boolean') return actual === v;
  return String(actual).trim() === String(v).trim();
}

export function relevantColumnsSubset(expected, actual) {
  if (!Array.isArray(actual)) return false;
  const aset = new Set(actual.map(String));
  return expected.every((c) => aset.has(String(c)));
}
