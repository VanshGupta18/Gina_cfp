'use client';

export interface UserMessageProps {
  text: string;
}

export function UserMessage({ text }: UserMessageProps) {
  return (
    <div className="flex justify-end mb-6">
      <div className="max-w-xs lg:max-w-[600px] px-6 py-4 rounded-xl bg-[#1C212E] border border-surface-border text-slate-200 text-sm shadow-md border-l-2 border-l-brand-indigo">
        {text}
      </div>
    </div>
  );
}
