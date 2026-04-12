'use client';

import React, { useState, useRef, useCallback } from 'react';
import { runPIIShield } from '@/lib/pii/shield';
import { uploadDataset } from '@/lib/api/datasets';
import { useDatasets } from '@/lib/hooks/useDatasets';
import PIISummaryBanner from './PIISummaryBanner';
import UnderstandingCard from './UnderstandingCard';
import { CorrectionModal } from './CorrectionModal';

interface UploadModalProps {
  onClose: () => void;
}

export default function UploadModal({ onClose }: UploadModalProps) {
  const { refreshDatasets } = useDatasets();
  
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // States to transition from upload -> pii summary -> understanding card
  const [redactedColumns, setRedactedColumns] = useState<string[]>([]);
  const [understandingCard, setUnderstandingCard] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadedDatasetId, setUploadedDatasetId] = useState<string | null>(null);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('Please upload a .csv file');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setError('File size must be under 50MB');
        return;
      }

      setIsProcessing(true);
      setError(null);
      setRedactedColumns([]);
      setUploadedDatasetId(null);
      setCorrectionModalOpen(false);

      try {
        const { redactedFile, redactedColumns: cols } = await runPIIShield(file);
        setRedactedColumns(cols);

        const result = await uploadDataset(redactedFile);

        setUnderstandingCard(result.understandingCard);
        setUploadedDatasetId(result.dataset.id);
        setUploadComplete(true);
        await refreshDatasets();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to process and upload dataset';
        setError(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [refreshDatasets],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        void handleProcessFile(e.dataTransfer.files[0]);
      }
    },
    [handleProcessFile],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void handleProcessFile(e.target.files[0]);
      }
    },
    [handleProcessFile],
  );

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-surface-secondary border border-surface-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-border">
          <h2 className="text-xl font-semibold text-slate-100">Upload Dataset</h2>
          {(!isProcessing || uploadComplete) && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {!uploadComplete && !isProcessing && (
            // Upload Zone
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                isDragging 
                  ? 'border-brand-teal bg-brand-teal/5' 
                  : 'border-surface-border hover:border-brand-teal/50 hover:bg-surface-tertiary'
              }`}
            >
              <input
                type="file"
                accept=".csv"
                className="hidden"
                ref={fileInputRef}
                onChange={onFileChange}
              />
              <div className="w-16 h-16 rounded-full bg-surface-tertiary flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-200 mb-2">
                Click to browse or drag and drop
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                CSV files only. Maximum size 50MB.
              </p>
              
              <div className="flex items-center gap-2 text-xs font-medium text-brand-teal px-3 py-1.5 rounded-full bg-brand-teal/10">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                PII Shield Active
              </div>
            </div>
          )}

          {isProcessing && (
            // Processing State
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 relative mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-surface-tertiary"></div>
                <div className="absolute inset-0 rounded-full border-4 border-brand-teal border-t-transparent animate-spin"></div>
              </div>
              
              {redactedColumns.length > 0 ? (
                <>
                  <h3 className="text-lg font-medium text-slate-200 mb-2">
                    Securing your data...
                  </h3>
                  <div className="max-w-md w-full text-left mt-6">
                    <PIISummaryBanner redactedColumns={redactedColumns} />
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-slate-200 mb-2">
                    Analyzing dataset...
                  </h3>
                  <p className="text-sm text-slate-400">
                    Running semantic profiling and generating understanding card.
                  </p>
                </>
              )}
            </div>
          )}

          {uploadComplete && understandingCard && (
            // Success State
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <PIISummaryBanner redactedColumns={redactedColumns} />
              <UnderstandingCard
                text={understandingCard}
                onCorrectionClick={
                  uploadedDatasetId ? () => setCorrectionModalOpen(true) : undefined
                }
              />
              
              <div className="mt-8 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-brand-teal text-white rounded-xl shadow-lg shadow-brand-teal/20 text-sm font-medium hover:bg-brand-teal-light transition-all"
                >
                  Start chatting
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {correctionModalOpen && uploadedDatasetId && (
      <CorrectionModal
        datasetId={uploadedDatasetId}
        onClose={() => setCorrectionModalOpen(false)}
        onSuccess={() => {
          setCorrectionModalOpen(false);
          void refreshDatasets();
        }}
      />
    )}
    </>
  );
}
