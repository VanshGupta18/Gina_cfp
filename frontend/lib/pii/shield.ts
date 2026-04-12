import Papa from 'papaparse';
import type { PIIRedactionResult } from '@/types';

/** Substrings in normalised header names — high-confidence PII (still checked per cell for value rules). */
const HEADER_PATTERNS = [
  'name',
  'email',
  'phone',
  'mobile',
  'tel',
  'dob',
  'birth',
  'ssn',
  'nino',
  'nin',
  'nationalinsurance',
  'address',
  'postcode',
  'pincode',
  'account',
  'sortcode',
  'salary',
  'gender',
  'passport',
  'ifsc',
  'aadhaar',
  'aadhar',
  'gstin',
  'pancard',
  'panno',
];

/**
 * Column looks like a date/time field — do not run value regexes (phone/account) on it.
 * Headers are normalised to letters/digits only (e.g. week_start_date → weekstartdate).
 */
function isLikelyTemporalAnalyticsColumn(headerNormalised: string): boolean {
  const h = headerNormalised;
  if (h.endsWith('date') || h.endsWith('time')) return true;
  if (h.includes('timestamp')) return true;
  return false;
}

/** Value looks like a common date/datetime — not phone/bank token. */
function looksLikeDateOrPlainDatetime(value: string): boolean {
  const v = value.trim();
  if (!v) return false;

  // ISO date or start of ISO datetime: 2024-01-15, 2024-01-15T12:00
  if (/^\d{4}-\d{2}-\d{2}([T\s].*)?$/.test(v)) return true;

  // Slash / dash dates
  if (/^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}$/.test(v)) return true;
  if (/^\d{4}[\/.\-]\d{2}[\/.\-]\d{2}$/.test(v)) return true;

  // Compact YYYYMMDD (often used in analytics CSVs)
  if (/^\d{8}$/.test(v)) {
    const y = Number.parseInt(v.slice(0, 4), 10);
    const mo = Number.parseInt(v.slice(4, 6), 10);
    const d = Number.parseInt(v.slice(6, 8), 10);
    if (y >= 1900 && y <= 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return true;
    }
  }

  return false;
}

const VALUE_REGEXES = {
  REDACTED_EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/i,
  /**
   * Indian mobile (+91 / 0 / bare 10 digits, first digit 6–9).
   * No broad “any long digit string” rule — avoids matching ISO dates.
   */
  REDACTED_PHONE:
    /^(?:\+91|0091)[\s.-]*[6-9]\d{9}$|^0[6-9]\d{9}$|^[6-9]\d{9}$/,
  /** UK postcode or Indian PIN (6 digits, first 1–9). */
  REDACTED_POSTCODE: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$|^[1-9]\d{5}$/i,
  REDACTED_ID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  REDACTED_SORT_CODE: /^\d{2}-\d{2}-\d{2}$/,
  /** Indian IFSC (e.g. SBIN0001234). */
  REDACTED_IFSC: /^[A-Z]{4}0[A-Z0-9]{6}$/i,
  /** Indian PAN (AAAAA9999A). */
  REDACTED_PAN: /^[A-Z]{5}[0-9]{4}[A-Z]$/i,
  /** UK NI — harmless on India-only data. */
  REDACTED_NI: /^[A-Z]{2}\d{6}[A-Z]$/i,
  /** Aadhaar often exported as 4-4-4 (avoid bare 12-digit to limit false positives). */
  REDACTED_AADHAAR: /^\d{4}\s\d{4}\s\d{4}$/,
  /** 8 digits — exclude values that are valid YYYYMMDD dates (handled above). */
  REDACTED_ACCOUNT: /^\d{8}$/,
} as const;

type ValueRedactionTag = keyof typeof VALUE_REGEXES;
type ColumnRedactionTag = 'REDACTED_CONFIDENTIAL' | ValueRedactionTag;

export async function runPIIShield(file: File): Promise<PIIRedactionResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data;
          const headers = results.meta.fields || [];

          let totalRedactions = 0;
          const redactedColumnsSet = new Set<string>();

          const columnDefs = headers.map((header) => {
            const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
            const isHeaderMatch = HEADER_PATTERNS.some((p) => lowerHeader.includes(p));
            const skipValueHeuristics = isLikelyTemporalAnalyticsColumn(lowerHeader);
            return {
              header,
              isHeaderMatch,
              skipValueHeuristics,
              redactionType: (isHeaderMatch ? 'REDACTED_CONFIDENTIAL' : null) as ColumnRedactionTag | null,
            };
          });

          const scanLimit = Math.min(rows.length, 50);
          for (const col of columnDefs) {
            if (col.isHeaderMatch) continue;
            if (col.skipValueHeuristics) continue;

            for (let i = 0; i < scanLimit; i++) {
              const val = String(rows[i][col.header] || '').trim();
              if (!val) continue;
              if (looksLikeDateOrPlainDatetime(val)) continue;

              let matchedType: ColumnRedactionTag | null = null;
              for (const type of Object.keys(VALUE_REGEXES) as ValueRedactionTag[]) {
                const regex = VALUE_REGEXES[type];
                if (type === 'REDACTED_ACCOUNT' && /^\d{8}$/.test(val)) {
                  const y = Number.parseInt(val.slice(0, 4), 10);
                  const mo = Number.parseInt(val.slice(4, 6), 10);
                  const d = Number.parseInt(val.slice(6, 8), 10);
                  if (y >= 1900 && y <= 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
                    continue;
                  }
                }
                if (regex.test(val)) {
                  matchedType = type;
                  break;
                }
              }

              if (matchedType) {
                col.redactionType = matchedType;
                break;
              }
            }
          }

          columnDefs.forEach((col) => {
            if (col.redactionType) {
              redactedColumnsSet.add(col.header);
            }
          });

          const finalRows = rows.map((row) => {
            const newRow: Record<string, string> = { ...row };

            for (const col of columnDefs) {
              if (col.redactionType && newRow[col.header] && String(newRow[col.header]).trim() !== '') {
                newRow[col.header] = `[${col.redactionType}]`;
                totalRedactions++;
              }
            }
            return newRow;
          });

          const csvText = Papa.unparse(finalRows);
          const redactedFile = new File([csvText], file.name, { type: 'text/csv' });

          resolve({
            redactedFile,
            redactedColumns: Array.from(redactedColumnsSet),
            totalRedactions,
          });
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => reject(err),
    });
  });
}
