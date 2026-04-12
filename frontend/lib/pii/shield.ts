import Papa from 'papaparse';
import type { PIIRedactionResult } from '@/types';

const HEADER_PATTERNS = [
  'name', 'email', 'phone', 'mobile', 'tel', 'dob', 'birth',
  'ssn', 'nino', 'nin', 'national_insurance', 'address', 'postcode',
  'account', 'sort_code', 'sortcode', 'salary', 'gender', 'passport'
];

const VALUE_REGEXES: Record<string, RegExp> = {
  REDACTED_EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/i,
  REDACTED_PHONE: /^(\+44|0044|0)?[\s-]?7\d{3}[\s-]?\d{6}$|^\+?[\d\s\-().]{10,}$/,
  REDACTED_POSTCODE: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i,
  REDACTED_ID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  REDACTED_SORT_CODE: /^\d{2}-\d{2}-\d{2}$/,
  REDACTED_NI: /^[A-Z]{2}\d{6}[A-Z]$/i,
  REDACTED_ACCOUNT: /^\d{8}$/
};

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

          // Prepare column metadata
          const columnDefs = headers.map(header => {
            const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
            const isHeaderMatch = HEADER_PATTERNS.some(p => lowerHeader.includes(p));
            return {
              header,
              isHeaderMatch,
              redactionType: isHeaderMatch ? 'REDACTED_CONFIDENTIAL' : null
            };
          });

          // Scan first 50 rows to infer missing regex-based redactions
          const scanLimit = Math.min(rows.length, 50);
          for (const col of columnDefs) {
            if (col.isHeaderMatch) continue; // Already flagged

            for (let i = 0; i < scanLimit; i++) {
              const val = String(rows[i][col.header] || '').trim();
              if (!val) continue;

              let matchedType = null;
              for (const [type, regex] of Object.entries(VALUE_REGEXES)) {
                if (regex.test(val)) {
                  matchedType = type;
                  break;
                }
              }

              if (matchedType) {
                col.redactionType = matchedType;
                break; // Flag whole column
              }
            }
          }

          // Apply redactions
          columnDefs.forEach(col => {
             if (col.redactionType) {
                redactedColumnsSet.add(col.header);
             }
          });

          const finalRows = rows.map(row => {
            const newRow: Record<string, string> = { ...row };
            
            formodification: for (const col of columnDefs) {
              if (col.redactionType && newRow[col.header] && String(newRow[col.header]).trim() !== '') {
                newRow[col.header] = `[${col.redactionType}]`;
                totalRedactions++;
              }
            }
            return newRow;
          });

          // Re-serialize back to CSV
          const csvText = Papa.unparse(finalRows);
          const redactedFile = new File([csvText], file.name, { type: 'text/csv' });

          resolve({
            redactedFile,
            redactedColumns: Array.from(redactedColumnsSet),
            totalRedactions
          });
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => reject(err)
    });
  });
}
