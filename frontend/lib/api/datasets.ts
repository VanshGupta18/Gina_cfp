import { apiFetch, createFormData } from './client';
import type { Dataset, UploadResult, SemanticState, SemanticCorrection } from '@/types';

/**
 * Datasets API endpoints
 */

export async function listDatasets(): Promise<Dataset[]> {
  const response = await apiFetch<{ datasets: Dataset[] }>('/api/datasets');
  return response.datasets;
}

export async function uploadDataset(file: File): Promise<UploadResult> {
  const formData = createFormData({ file });

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
