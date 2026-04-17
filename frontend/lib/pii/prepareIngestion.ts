import * as XLSX from 'xlsx';
import { runPIIShield } from '@/lib/pii/shield';

/** Matches backend `uploadIngestion.ts` schema */
export type IngestionPayloadV1 = {
  version: 1;
  sheets: Array<{ sheetName: string; csv: string }>;
  piiSummary: {
    redactedColumns: string[];
    totalRedactions: number;
  };
};

/**
 * Run PII shield per sheet (Excel) or once (CSV), producing JSON for multipart field `ingestion`.
 * Original `file` is uploaded separately as the exact user file for S3.
 */
export async function prepareIngestionFromFile(file: File): Promise<IngestionPayloadV1> {
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.csv')) {
    const { redactedFile, redactedColumns, totalRedactions } = await runPIIShield(file);
    const csv = await redactedFile.text();
    return {
      version: 1,
      sheets: [{ sheetName: '_', csv }],
      piiSummary: { redactedColumns, totalRedactions },
    };
  }

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheets: Array<{ sheetName: string; csv: string }> = [];
    const redactedColumns: string[] = [];
    let totalRedactions = 0;

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;
      const csv = XLSX.utils.sheet_to_csv(ws);
      if (!csv.trim()) continue;

      const mini = new File([csv], `${sheetName}.csv`, { type: 'text/csv' });
      const r = await runPIIShield(mini);
      totalRedactions += r.totalRedactions;
      for (const col of r.redactedColumns) {
        redactedColumns.push(`${sheetName}: ${col}`);
      }
      const redactedCsv = await r.redactedFile.text();
      sheets.push({ sheetName, csv: redactedCsv });
    }

    if (sheets.length === 0) {
      throw new Error('No non-empty sheets found in this workbook');
    }

    return {
      version: 1,
      sheets,
      piiSummary: { redactedColumns, totalRedactions },
    };
  }

  throw new Error('Unsupported file type. Use .csv, .xlsx, or .xls');
}
