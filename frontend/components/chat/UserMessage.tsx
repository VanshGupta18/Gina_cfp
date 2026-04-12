'use client';

export interface UserMessageProps {
  text: string;
}

export function UserMessage({ text }: UserMessageProps) {
  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-lg bg-brand-teal text-white text-sm">
        {text}
      </div>
    </div>
  );
}
