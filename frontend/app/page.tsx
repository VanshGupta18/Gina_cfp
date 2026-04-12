'use client';

import { useState } from 'react';
import AuthModal from '@/components/landing/AuthModal';

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-surface">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-teal/10 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-brand-navy-light/20 blur-[100px] animate-pulse [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-brand-teal/5 blur-[80px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-teal/30 bg-brand-teal/10 px-4 py-1.5 mb-8">
          <span className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
          <span className="text-xs font-medium text-brand-teal tracking-wide uppercase">
            NatWest Code for Purpose 2026
          </span>
        </div>

        {/* Wordmark */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-100 mb-4">
          Talk to{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-teal to-brand-teal-light">
            Data
          </span>
        </h1>

        {/* Tagline */}
        <p className="text-xl sm:text-2xl font-medium text-slate-300 mb-4">
          Ask your data anything.{' '}
          <span className="text-slate-100">Get plain English answers instantly.</span>
        </p>

        {/* Sub-copy */}
        <p className="text-base sm:text-lg text-slate-400 mb-10 max-w-xl leading-relaxed">
          Upload a CSV. Ask a question. No SQL, no dashboards, no guesswork.
          <br />
          Powered by AI that shows its work.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {[
            '🔒 Privacy-first PII shield',
            '⚡ Real-time SQL execution',
            '📊 Auto-generated charts',
            '🔍 Explainable reasoning',
          ].map((feature) => (
            <span
              key={feature}
              className="rounded-full border border-surface-border bg-surface-secondary px-3 py-1 text-sm text-slate-300"
            >
              {feature}
            </span>
          ))}
        </div>

        {/* CTA */}
        <button
          id="get-started-btn"
          onClick={() => setShowAuth(true)}
          className="group relative inline-flex items-center gap-2 rounded-xl bg-brand-teal px-8 py-4 text-base font-semibold text-white shadow-lg shadow-brand-teal/20 transition-all duration-200 hover:bg-brand-teal-light hover:shadow-brand-teal/30 hover:scale-105 active:scale-100"
        >
          Get started
          <svg
            className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>

        {/* Sub-CTA */}
        <p className="mt-4 text-sm text-slate-500">
          Free to use · Secured with Google OAuth · No data stored as-is
        </p>
      </div>

      {/* Auth Modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  );
}
