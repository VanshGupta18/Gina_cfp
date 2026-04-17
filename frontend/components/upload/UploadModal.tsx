'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { prepareIngestionFromFile, type IngestionPayloadV1 } from '@/lib/pii/prepareIngestion';
import { uploadDataset } from '@/lib/api/datasets';
import { createConversation } from '@/lib/api/conversations';
import { useDatasets } from '@/lib/hooks/useDatasets';
import PIISummaryBanner from './PIISummaryBanner';
import UnderstandingCard from './UnderstandingCard';
import { InlineCorrectionPanel } from '@/components/semantic/InlineCorrectionPanel';
import { UploadCloud, ShieldAlert, CheckCircle2, ChevronRight, RotateCcw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface UploadModalProps {
  onClose: () => void;
}

export default function UploadModal({ onClose }: UploadModalProps) {
  const { setActiveDataset, refreshDatasets } = useDatasets();
  const router = useRouter();
  
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom states for steps (01 Intake, 02 Risk, 03 Mapping)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [redactedColumns, setRedactedColumns] = useState<string[]>([]);
  const [ingestionMemo, setIngestionMemo] = useState<IngestionPayloadV1 | null>(null);
  const [originalFileMemo, setOriginalFileMemo] = useState<File | null>(null);
  const [understandingCard, setUnderstandingCard] = useState<string | null>(null);
  const [uploadedDatasetId, setUploadedDatasetId] = useState<string | null>(null);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [fileDetails, setFileDetails] = useState<{name: string, size: string} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formatting utility for MB
  const formatBytes = (bytes: number, decimals = 2) => {
      if (!+bytes) return '0 Bytes';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  const performUpload = useCallback(
    async (originalFile: File, ingestion: IngestionPayloadV1) => {
      setIsProcessing(true);
      setError(null);
      try {
        const result = await uploadDataset(originalFile, ingestion);

        setUnderstandingCard(result.understandingCard);
        setUploadedDatasetId(result.dataset.id);

        setStep(3);
        await refreshDatasets();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
        setError(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [refreshDatasets],
  );

  const handleProcessFile = useCallback(
    async (file: File) => {
      const lower = file.name.toLowerCase();
      if (!lower.endsWith('.csv') && !lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
        setError('Please upload a .csv, .xlsx, or .xls file');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setError('File size must be under 50MB');
        return;
      }

      setFileDetails({ name: file.name, size: formatBytes(file.size) });
      setIsProcessing(true);
      setError(null);
      setRedactedColumns([]);
      setUploadedDatasetId(null);
      setCorrectionModalOpen(false);
      setIngestionMemo(null);
      setOriginalFileMemo(null);

      try {
        const ingestion = await prepareIngestionFromFile(file);
        setRedactedColumns(ingestion.piiSummary.redactedColumns);
        setIngestionMemo(ingestion);
        setOriginalFileMemo(file);
        setStep(2);

        await performUpload(file, ingestion);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to process and upload dataset';
        setError(message);
        setStep(1);
        setIsProcessing(false);
      }
    },
    [performUpload],
  );

  const handleStartAsking = async () => {
    if (!uploadedDatasetId) return;
    
    setIsProcessing(true); // Re-use processing state for button spin
    try {
      setActiveDataset(uploadedDatasetId);
      const newConv = await createConversation(uploadedDatasetId, "New Conversation");
      onClose();
      if (newConv) {
        router.push(`/app/${newConv.id}`);
      }
    } catch (e) {
      console.error(e);
      // Fallback
      onClose();
    }
  };

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
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        step === 1 ? 'Upload a dataset' :
        step === 2 ? 'Verify protection layers' :
        'Analysis complete'
      }
    >
      <div className="flex flex-col">
        {/* Step indicator pills */}
        <div className="flex items-center gap-2 mb-8">
          {[1,2,3].map((s) => (
            <div
              key={s}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: step >= s ? '24px' : '8px',
                background: step >= s
                  ? 'linear-gradient(90deg, #5A4EE3, #3CE0D6)'
                  : 'rgba(255,255,255,0.10)',
              }}
            />
          ))}
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* STEP 1: INITIAL INTAKE */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 rounded-xl p-10"
              style={{
                border: isDragging
                  ? '2px dashed rgba(90,78,227,0.7)'
                  : '2px dashed rgba(90,78,227,0.25)',
                background: isDragging
                  ? 'rgba(90,78,227,0.07)'
                  : 'rgba(15,18,26,0.5)',
                boxShadow: isDragging
                  ? 'inset 0 0 40px rgba(90,78,227,0.08)'
                  : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isDragging) {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(90,78,227,0.45)';
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(90,78,227,0.04)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDragging) {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(90,78,227,0.25)';
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(15,18,26,0.5)';
                }
              }}
            >
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                ref={fileInputRef}
                onChange={onFileChange}
              />

              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{
                  background: 'rgba(90,78,227,0.12)',
                  border: '1px solid rgba(90,78,227,0.25)',
                }}
              >
                <UploadCloud className="w-7 h-7 text-brand-indigo-light" strokeWidth={1.5} />
              </div>

              <h3 className="text-base font-semibold text-slate-200 mb-1">
                Drop your spreadsheet here
              </h3>
              <div className="text-sm text-slate-500 mb-3 inline-flex items-center gap-1">
                or <span className="text-brand-indigo-light font-medium">click to browse</span>
              </div>
              <p className="text-xs text-slate-600">.csv, .xlsx, .xls · max 50MB</p>
            </div>

            <div
              className="flex items-start gap-3 rounded-xl p-4"
              style={{
                background: 'rgba(60,224,214,0.05)',
                border: '1px solid rgba(60,224,214,0.18)',
              }}
            >
              <div className="mt-0.5 text-emerald-400 shrink-0">
                <ShieldAlert className="w-4 h-4" strokeWidth={2} />
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                PII automatically detected and redacted. Your data remains private and encrypted under G.I.N.A core security protocols.
              </p>
            </div>

            <div className="flex justify-end items-center mt-1">
              <Button variant="ghost" onClick={onClose} className="mr-0 font-medium">Cancel</Button>
            </div>
          </div>
        )}

        {/* STEP 2: RISK MITIGATION */}
        {step === 2 && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <PIISummaryBanner redactedColumns={redactedColumns} />

            <div className="border border-emerald-500/30 border-dashed rounded-xl p-6 bg-emerald-500/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-[10px] font-mono uppercase border border-emerald-500/20 px-1 text-center leading-tight">
                  {fileDetails?.name?.toLowerCase().endsWith('.csv') ? 'CSV' : 'XLS'}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-base font-bold text-white">{fileDetails?.name || 'dataset.csv'}</span>
                  <span className="text-sm text-slate-400">{fileDetails?.size || 'Unknown size'} · Ready for processing</span>
                  
                  {redactedColumns.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {redactedColumns.map(col => (
                        <span key={col} className="px-2 py-0.5 rounded flex items-center text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {col}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>

            <p className="text-xs text-slate-500 italic">
              *The identified columns contain pattern-matched sensitive information and have been masked for the session.*
            </p>

            <div className="flex justify-between items-center mt-2">
              <Button variant="ghost" onClick={() => setStep(1)} className="px-0 hover:bg-transparent">
                Go back
              </Button>
              
              {isProcessing ? (
                <Button variant="primary" disabled className="gap-2">
                  Processing <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                </Button>
              ) : (
                <Button
                  variant="danger"
                  onClick={() => {
                    if (originalFileMemo && ingestionMemo) {
                      void performUpload(originalFileMemo, ingestionMemo);
                    }
                  }}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Retry Upload
                </Button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: INTELLIGENCE MAPPING */}
        {step === 3 && understandingCard && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <UnderstandingCard 
              text={understandingCard} 
              onCorrectionClick={() => setCorrectionModalOpen((prev) => !prev)} 
            />
            {correctionModalOpen && uploadedDatasetId && (
              <InlineCorrectionPanel
                datasetId={uploadedDatasetId}
                onClose={() => setCorrectionModalOpen(false)}
                onSuccess={(state) => {
                  setUnderstandingCard(state.understandingCard);
                  setCorrectionModalOpen(false);
                  void refreshDatasets();
                }}
              />
            )}

            <div className="flex justify-between items-center mt-2 border-t border-surface-border pt-6">
              <Button variant="ghost" onClick={() => setStep(1)} className="px-0 hover:bg-transparent">Upload another</Button>
              <Button 
                variant="primary"
                onClick={handleStartAsking} 
                disabled={isProcessing}
                className="gap-2 group"
              >
                {isProcessing ? (
                  <>Starting... <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/></>
                ) : (
                  <>
                    Start asking questions
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}
