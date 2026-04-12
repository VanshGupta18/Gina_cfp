/**
 * Talk to Data — Frontend Types
 * Mirrors backend schema + pipeline structures
 */

// =====================================================
// Data Models
// =====================================================

export interface Dataset {
  id: string;
  name: string;
  rowCount: number | null;
  columnCount: number | null;
  isDemo: boolean;
  demoSlug: string | null;
  createdAt: string;
}

export interface ColumnProfile {
  columnName: string;
  semanticType: 'amount' | 'date' | 'category' | 'identifier' | 'flag' | 'text';
  businessLabel: string;
  description?: string;
  nullRate?: number;
  uniqueCount?: number;
  sampleValues?: string[];
}

/** One correction in PATCH /api/datasets/:datasetId/semantic — backend `semanticPatchBodySchema` */
export interface SemanticCorrection {
  columnName: string;
  newSemanticType: ColumnProfile['semanticType'];
  newBusinessLabel: string;
  newDescription: string;
}

export interface SemanticState {
  id: string;
  datasetId: string;
  schemaJson: {
    tableName: string;
    columns: ColumnProfile[];
    understandingCard?: string;
  };
  understandingCard: string;
  isUserCorrected: boolean;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  datasetId: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  outputPayload?: OutputPayload;
  createdAt: string;
}

// =====================================================
// Pipeline & Query
// =====================================================

export interface PipelineStep {
  step: string;
  label?: string;
  status: 'pending' | 'running' | 'complete' | 'warning';
  detail?: string;
  durationMs?: number;
}

export type QueryIntent = 'conversational' | 'simple_query' | 'complex_query' | 'follow_up_cache';

export interface QueryPayload {
  datasetId: string;
  conversationId: string;
  question: string;
  sessionContext?: SessionContext;
}

/** Matches backend `queryBodySchema` in `backend/src/routes/query.ts` */
export interface SessionContext {
  recentExchanges: Array<{
    question: string;
    answer: string;
  }>;
  /** Optional; backend accepts unknown (e.g. prior query rows). Omit when not available. */
  lastResultSet?: unknown | null;
}

// =====================================================
// Output & Charts
// =====================================================

export type ChartType = 'big_number' | 'bar' | 'line' | 'grouped_bar' | 'stacked_bar' | 'table';

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
}

export interface StandardChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface BigNumberChartData {
  label: string;
  value: string | number;
}

export type ChartData = StandardChartData | BigNumberChartData;

export interface OutputPayload {
  messageId: string;
  keyFigure: string;
  narrative: string;
  chartType: ChartType;
  chartData: ChartData;
  citationChips: string[];
  sql: string;
  secondarySql?: string | null;
  confidenceScore: number;
  followUpSuggestions: string[];
  rowCount: number;
  cacheHit?: boolean;
  autoInsights: string[];
  snapshotUsed: boolean;
}

// =====================================================
// UI State
// =====================================================

export interface AuthUser {
  id: string;
  email: string;
}

export interface UploadResult {
  dataset: Dataset;
  semanticState: SemanticState;
  understandingCard: string;
  piiSummary: {
    redactedColumns: string[];
    totalRedactions: number;
  };
}

export interface PIIRedactionResult {
  redactedFile: File;
  redactedColumns: string[];
  totalRedactions: number;
}

// =====================================================
// API Response Shapes
// =====================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface DatasetsListResponse {
  datasets: Dataset[];
}

export interface ConversationsListResponse {
  conversations: Conversation[];
}

export interface MessagesListResponse {
  messages: Message[];
}

export interface SemanticStateResponse {
  schema: ColumnProfile[];
  understandingCard: string;
  isUserCorrected: boolean;
}
