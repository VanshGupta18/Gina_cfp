import React from 'react';
import { Shield } from 'lucide-react';

interface PIISummaryBannerProps {
  redactedColumns: string[];
}

export default function PIISummaryBanner({ redactedColumns }: PIISummaryBannerProps) {
  if (redactedColumns.length === 0) return null;

  return (
    <div className="rounded-xl bg-[#613A1B]/30 border-t-2 border-t-[#E8A54F] border border-[#613A1B]/50 p-4 w-full">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-[#E8A54F] shrink-0" fill="#E8A54F" />
        <h4 className="text-sm font-semibold text-white">
          We detected and redacted {redactedColumns.length} sensitive column{redactedColumns.length > 1 ? 's' : ''} from your dataset.
        </h4>
      </div>
    </div>
  );
}
