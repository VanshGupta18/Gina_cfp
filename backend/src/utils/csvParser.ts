import Papa from 'papaparse';

export interface ParsedCSV {
  /** Trimmed CSV header names (raw, used as columnName in profiles). */
  headers: string[];
  /** One object per row, keyed by original header. */
  rows: Record<string, string>[];
}

/**
 * Parse a CSV string using PapaParse.
 * Headers are trimmed; empty lines are skipped.
 */
export function parseCSV(csvText: string): ParsedCSV {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  const headers = result.meta.fields ?? [];
  return { headers, rows: result.data };
}
