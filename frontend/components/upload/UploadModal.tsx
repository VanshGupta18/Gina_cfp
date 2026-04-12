'use client';

import React, { useState, useRef, useCallback } from 'react';
import { runPIIShield } from '@/lib/pii/shield';
import { uploadDataset } from '@/lib/api/datasets';
import { useDatasets } from '@/lib/hooks/useDatasets';
import PIISummaryBanner from './PIISummaryBanner';
import UnderstandingCard from './UnderstandingCard';
import { CorrectionModal } from './CorrectionModal';
import { UploadCloud, ShieldAlert, CheckCircle2, ChevronRight, X, Sparkles } from 'lucide-react';

interface UploadModalProps {
  onClose: () => void;
}

export default function UploadModal({ onClose }: UploadModalProps) {
  const { refreshDatasets } = useDatasets();
  
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom states for steps (01 Intake, 02 Risk, 03 Mapping)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [redactedColumns, setRedactedColumns] = useState<string[]>([]);
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

      setFileDetails({ name: file.name, size: formatBytes(file.size) });
      setIsProcessing(true);
      setError(null);
      setRedactedColumns([]);
      setUploadedDatasetId(null);
      setCorrectionModalOpen(false);

      try {
        // Step 1 done -> Move to Step 2 (Risk Mitigation view implicitly inside processing)
        const { redactedFile, redactedColumns: cols } = await runPIIShield(file);
        setRedactedColumns(cols);
        
        // Show step 2 for at least a beat
        setStep(2);

        // Upload and get understanding
        const result = await uploadDataset(redactedFile);

        setUnderstandingCard(result.understandingCard);
        setUploadedDatasetId(result.dataset.id);
        
        // Step 3 (Intelligence Mapping)
        setStep(3);
        await refreshDatasets();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to process and upload dataset';
        setError(message);
        setStep(1);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F121A]/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-[540px] bg-[#141822] border border-surface-border rounded-xl shadow-2xl flex flex-col pt-8 pb-10 px-10">
        
        {/* State Steps Subheader */}
        <div className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-8">
          {step === 1 && 'STATE 01: INITIAL INTAKE'}
          {step === 2 && 'STATE 02: RISK MITIGATION'}
          {step === 3 && 'STATE 03: INTELLIGENCE MAPPING'}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {step === 1 && 'Upload a dataset'}
            {step === 2 && 'Verify protection layers'}
            {step === 3 && <span className="flex items-center gap-3"><span className="w-5 h-5 rounded-full border-2 border-brand-indigo border-t-transparent animate-spin"/> Analysing your data...</span>}
          </h2>
          {step === 1 && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* STEP 1: INITIAL INTAKE */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                isDragging 
                  ? 'border-brand-indigo bg-brand-indigo/5' 
                  : 'border-slate-600 hover:border-slate-400 hover:bg-white/[0.02]'
              }`}
            >
              <input
                type="file"
                accept=".csv"
                className="hidden"
                ref={fileInputRef}
                onChange={onFileChange}
              />
              
              <div className="mb-4 text-brand-indigo">
                <UploadCloud className="w-10 h-10" strokeWidth={1.5} />
              </div>
              
              <h3 className="text-lg font-medium text-slate-200 mb-1">
                Drop your CSV file here
              </h3>
              <div className="text-base text-slate-400 mb-4 inline-flex items-center gap-1">
                or <span className="text-brand-indigo-light hover:underline font-medium">click to browse</span>
              </div>
              
              <p className="text-xs text-slate-500">
                .csv only · max 50MB
              </p>
            </div>

            <div className="bg-surface-secondary border border-surface-border rounded-xl p-4 flex items-start gap-4">
              <div className="mt-0.5 text-emerald-400">
                <ShieldAlert className="w-5 h-5" strokeWidth={2} />
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                PII automatically detected and redacted. Your data remains private and encrypted under G.I.N.A core security protocols.
              </p>
            </div>

            <div className="flex justify-between items-center mt-2">
              <button onClick={onClose} className="text-sm font-medium text-slate-400 hover:text-white transition">Cancel</button>
              <button disabled className="px-6 py-2.5 bg-surface-tertiary text-slate-400 rounded-lg text-sm font-medium cursor-not-allowed">Upload</button>
            </div>
          </div>
        )}

        {/* STEP 2: RISK MITIGATION */}
        {step === 2 && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <PIISummaryBanner redactedColumns={redactedColumns} />

            <div className="border border-emerald-500/30 border-dashed rounded-xl p-6 bg-emerald-500/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xs font-mono uppercase border border-emerald-500/20">
                  CSV
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
              <button onClick={() => setStep(1)} className="text-sm font-medium text-slate-400 hover:text-white transition">Cancel</button>
              <button disabled className="px-6 py-2.5 bg-brand-indigo text-white rounded-lg text-sm font-semibold flex items-center gap-2 opacity-70">
                Processing <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: INTELLIGENCE MAPPING */}
        {step === 3 && understandingCard && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="bg-surface-secondary border-l-2 border-brand-indigo rounded-r-xl p-6 shadow-lg">
              <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-brand-indigo-light mb-4 uppercase">
                <Sparkles className="w-3.5 h-3.5" /> G.I.N.A INTELLIGENCE
              </div>
              <h3 className="text-lg font-bold text-white mb-2">G.I.N.A understands your dataset</h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-5">
                {understandingCard}
              </p>
              
              <div className="w-full flex items-center justify-between text-xs font-medium border-t border-surface-border pt-4">
                <span className="flex items-center gap-2 text-brand-cyan">
                  <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></span>
                  Processing rows
                </span>
                <span className="text-slate-400 text-mono">100% complete</span>
              </div>
            </div>

            <div className="flex justify-between items-center mt-2 border-t border-surface-border pt-6">
              <button onClick={onClose} className="text-sm font-medium text-slate-400 hover:text-white transition">Upload another</button>
              <button 
                onClick={onClose} 
                className="px-6 py-2.5 hover:bg-brand-indigo-light bg-brand-indigo text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors group"
              >
                Start asking questions
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}

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
