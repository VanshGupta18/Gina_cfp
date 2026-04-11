/** §9 OutputPayload / SSE `result` event (messages.output_payload JSONB). */
export type QueryResultPayload = {
  messageId: string;
  narrative: string;
  chartType: 'bar' | 'line' | 'big_number' | 'grouped_bar' | 'stacked_bar' | 'table';
  chartData:
    | {
        labels: string[];
        datasets: Array<{ label: string; data: number[] }>;
      }
    | { value: number; label: string };
  keyFigure: string;
  citationChips: string[];
  sql: string;
  secondarySql: string | null;
  rowCount: number;
  confidenceScore: number;
  followUpSuggestions: string[];
  autoInsights: string[];
  cacheHit: boolean;
  snapshotUsed: boolean;
};
