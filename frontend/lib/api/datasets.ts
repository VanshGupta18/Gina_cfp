import { apiFetch } from './client';
import type {
  Dataset,
  UploadResult,
  SemanticState,
  SemanticCorrection,
  DatasetPreviewResponse,
} from '@/types';

/**
 * Datasets API endpoints
 */

export async function listDatasets(): Promise<Dataset[]> {
  const response = await apiFetch<{ datasets: Dataset[] }>('/api/datasets');
  return response.datasets;
}

/**
 * Upload a spreadsheet; the server parses it, runs PII redaction, stores redacted bytes in S3,
 * and ingests redacted data for querying.
 */
export async function uploadDataset(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiFetch<UploadResult>('/api/datasets/upload', {
    method: 'POST',
    body: formData,
  });

  return response;
}

export async function getSemanticState(datasetId: string): Promise<SemanticState> {
  const response = await apiFetch<SemanticState>(`/api/datasets/${datasetId}/semantic`);
  return response;
}

export async function getDatasetPreview(
  datasetId: string,
  options?: { limit?: number; offset?: number }
): Promise<DatasetPreviewResponse> {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set('limit', String(options.limit));
  if (options?.offset != null) params.set('offset', String(options.offset));
  const q = params.toString();
  const path = `/api/datasets/${datasetId}/preview${q ? `?${q}` : ''}`;
  return apiFetch<DatasetPreviewResponse>(path);
}

export async function patchSemanticState(
  datasetId: string,
  corrections: SemanticCorrection[]
): Promise<SemanticState> {
  const response = await apiFetch<SemanticState>(`/api/datasets/${datasetId}/semantic`, {
    method: 'PATCH',
    body: JSON.stringify({ corrections }),
  });

  return response;
}

export async function updateDataset(datasetId: string, body: { name: string }): Promise<Dataset> {
  return apiFetch<Dataset>(`/api/datasets/${datasetId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteDataset(datasetId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/datasets/${datasetId}`, {
    method: 'DELETE',
  });
}
