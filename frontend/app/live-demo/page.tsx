'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import AuthModal from '@/components/landing/AuthModal';
import { Sparkles, ChevronRight, ArrowRight, Zap, BarChart3, ShieldCheck } from 'lucide-react';

const exampleQueries = [
  {
    question: 'What was the total revenue in Q3?',
    result: '$2.4M',
    accuracy: 'Verified',
    rows: '12,847',
    sql: "SELECT SUM(revenue) FROM your_data WHERE quarter = 'Q3'",
    insight: 'Q3 revenue was $2.4M, up 18% from Q2. July was the strongest month at $920K.',
    chart: [65, 72, 80, 95, 88, 100, 92],
  },
  {
    question: 'Which product had the highest return rate?',
    result: '14.3%',
    accuracy: 'Verified',
    rows: '8,203',
    sql: 'SELECT product_name, AVG(return_rate) as rate FROM your_data GROUP BY product_name ORDER BY rate DESC LIMIT 1',
    insight: '"Pro Wireless Headset" had the highest return rate at 14.3%, mainly due to connectivity issues reported in reviews.',
    chart: [40, 55, 60, 72, 68, 58, 50],
  },
  {
    question: 'Show me the top 5 customers by spend.',
    result: 'Top: Acme Corp',
    accuracy: 'Highest',
    rows: '12,847',
    sql: 'SELECT customer_name, SUM(total_spend) as spend FROM your_data GROUP BY customer_name ORDER BY spend DESC LIMIT 5',
    insight: 'Top 5 customers account for 38% of total revenue. Acme Corp leads at $340K lifetime value.',
    chart: [100, 82, 74, 61, 55, 40, 30],
  },
  {
    question: 'What is the average order value by region?',
    result: '$86.40',
    accuracy: 'Estimated',
    rows: '8,203',
    sql: 'SELECT region, AVG(order_value) as avg_value FROM your_data GROUP BY region ORDER BY avg_value DESC',
    insight: 'West region leads with $112 AOV. South is lowest at $64. Overall average is $86.40.',
    chart: [112, 98, 87, 75, 64, 70, 80],
  },
  {
    question: 'How many new users signed up last month?',
    result: '3,842',
    accuracy: 'Verified',
    rows: '3,842',
    sql: "SELECT COUNT(user_id) FROM your_data WHERE signup_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')",
    insight: '3,842 new users signed month — a 23% increase MoM. Organic search drove 61% of signups.',
    chart: [2200, 2500, 2800, 3100, 3400, 3600, 3842],
  },
  {
    question: 'Which sales rep closed the most deals?',
    result: '94 deals',
    accuracy: 'Verified',
    rows: '8,203',
    sql: 'SELECT sales_rep, COUNT(deal_id) as deals FROM your_data GROUP BY sales_rep ORDER BY deals DESC LIMIT 1',
    insight: 'Sarah Johnson closed 94 deals this quarter — 31% above the team average of 72.',
    chart: [94, 87, 80, 75, 72, 68, 60],
  },
];

const stats = [
  { icon: Zap, label: 'Avg. response time', value: '1.8s' },
  { icon: BarChart3, label: 'Queries answered', value: '2.1M+' },
  { icon: ShieldCheck, label: 'Accuracy score', value: 'High' },
];

// Mini bar chart component
function MiniChart({ data, color = '#7267F2' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all duration-700"
          style={{
            height: `${(v / max) * 100}%`,
            background: `${color}`,
            opacity: i === data.length - 1 ? 1 : 0.4 + (i / data.length) * 0.4,
          }}
        />
      ))}
    </div>
  );
}

export default function LiveDemoPage() {
  const [showAuth, setShowAuth] = useState(false);
  const [activeQuery, setActiveQuery] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [showResult, setShowResult] = useState(true);

  const current = exampleQueries[activeQuery];

  const handleQuerySelect = (i: number) => {
    if (i === activeQuery) return;
    setShowResult(false);
    setTypedText('');
    setTimeout(() => {
      setActiveQuery(i);
    }, 300);
    setTimeout(() => {
      setShowResult(true);
    }, 600);
  };

  // Simulate typing the SQL
  useEffect(() => {
    if (!showResult) return;
    setTypedText('');
    const sql = current.sql;
    let i = 0;
    const interval = setInterval(() => {
      if (i < sql.length) {
        setTypedText(sql.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 18);
    return () => clearInterval(interval);
  }, [current.sql, showResult]);

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans text-slate-200 selection:bg-brand-indigo/30">
      {/* Header */}
      <header className="w-full border-b border-white/5 py-4 px-8 flex items-center justify-between z-20 sticky top-0 bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold tracking-tight text-white">
            G.I.N.A
          </Link>
          <div className="group flex items-center gap-2 rounded-full border border-brand-indigo/30 bg-brand-indigo/10 px-3 py-1 cursor-default hover:border-brand-indigo/60 hover:bg-brand-indigo/20 transition-all duration-300 shadow-[0_0_10px_rgba(90,78,227,0.1)] hover:shadow-[0_0_16px_rgba(90,78,227,0.25)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-indigo-light opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-indigo-light"></span>
            </span>
            <span className="text-[10px] font-black tracking-[0.15em] text-brand-indigo-light uppercase">Live Demo</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => setShowAuth(true)}
            className="text-sm font-semibold tracking-wide text-slate-300 hover:text-white transition-colors uppercase"
          >
            LOG IN
          </button>
          <button
            onClick={() => setShowAuth(true)}
            className="text-sm font-semibold tracking-wide text-white border border-white/20 rounded-lg px-5 py-2.5 hover:bg-white/5 transition-colors"
          >
            Get started
          </button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pt-16 pb-10 text-center">
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.08]"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-brand-indigo/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-indigo/10 border border-brand-indigo/30 px-4 py-1.5 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-indigo-light opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-indigo-light"></span>
              </span>
              <span className="text-xs font-bold tracking-widest text-brand-indigo-light uppercase">Interactive demo</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-4">
              Ask anything about{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-indigo-light to-brand-cyan">
                your data
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-xl mx-auto mb-8">
              Click any question below to see G.I.N.A generate the SQL, execute it, and return a grounded answer — instantly.
            </p>

            {/* Stats row */}
            <div className="flex items-center justify-center gap-6 flex-wrap">
              {stats.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-brand-indigo-light" />
                    <span className="text-sm text-slate-400">{s.label}:</span>
                    <span className="text-sm font-bold text-white">{s.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Interactive Demo */}
        <section className="px-6 pb-20 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Query Selector — left column */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-1">
                Select a question
              </p>
              {exampleQueries.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleQuerySelect(i)}
                  className={`flex items-start gap-3 px-5 py-4 rounded-xl border text-left transition-all duration-200 group ${
                    activeQuery === i
                      ? 'border-brand-indigo bg-brand-indigo/10 text-white shadow-[0_0_20px_rgba(90,78,227,0.15)]'
                      : 'border-surface-border bg-surface-secondary text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}
                >
                  <ChevronRight
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 transition-transform duration-200 ${
                      activeQuery === i ? 'text-brand-indigo-light translate-x-0.5' : 'text-slate-600'
                    }`}
                  />
                  <span className="text-sm font-medium leading-snug">{q.question}</span>
                </button>
              ))}
            </div>

            {/* Result Panel — right column */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-1">
                G.I.N.A response
              </p>

              {/* Response header */}
              <div
                className={`rounded-2xl border border-surface-border bg-surface-secondary p-6 relative overflow-hidden transition-all duration-300 ${
                  showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-indigo/50 to-transparent" />

                {/* G.I.N.A header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-brand-indigo flex items-center justify-center shadow-[0_0_12px_rgba(90,78,227,0.4)]">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">G.I.N.A · answering</p>
                    <p className="text-sm font-semibold text-brand-indigo-light">{current.question}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Result', value: current.result },
                    { label: 'Accuracy', value: current.accuracy },
                    { label: 'Rows scanned', value: current.rows },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-surface-tertiary border border-surface-border px-4 py-3">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-xl font-black text-white">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div className="rounded-xl bg-surface-tertiary border border-surface-border px-4 py-4 mb-5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">Trend</p>
                  <MiniChart data={current.chart} />
                </div>

                {/* Insight */}
                <div className="rounded-xl bg-brand-indigo/5 border border-brand-indigo/20 px-4 py-3 mb-5">
                  <p className="text-[10px] text-brand-indigo-light uppercase tracking-widest mb-1 font-bold">AI Insight</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{current.insight}</p>
                </div>

                {/* SQL with typing animation */}
                <div className="rounded-xl bg-[#0A0D14] border border-surface-border px-4 py-4 font-mono text-xs leading-relaxed overflow-x-auto">
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">Generated SQL</p>
                  <span className="text-slate-300">{typedText}</span>
                  <span className="inline-block w-0.5 h-3 bg-brand-indigo-light ml-0.5 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-20 border-t border-surface-border relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-indigo/5 to-transparent pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-brand-indigo/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-white mb-4">Ready to use it on your own data?</h2>
            <p className="text-lg text-slate-400 mb-8 max-w-md mx-auto">
              Upload any CSV and get answers in under 3 seconds. No SQL, no setup, no credit card.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setShowAuth(true)}
                className="bg-white text-slate-900 px-10 py-4 rounded-lg text-base font-bold hover:bg-slate-100 transition-colors w-full sm:w-auto"
              >
                Get started for free
              </button>
              <Link
                href="/how-it-works"
                className="flex items-center gap-2 text-slate-300 hover:text-white border border-surface-border px-8 py-4 rounded-lg text-sm font-medium transition-colors hover:border-white/20"
              >
                How it works
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-border bg-[#0A0D14] py-8 px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold text-white">G.I.N.A</Link>
          <p className="text-xs text-slate-500">© 2026 G.I.N.A Intelligence. All rights reserved.</p>
          <Link href="/how-it-works" className="text-xs text-slate-400 hover:text-white transition-colors">How it works</Link>
        </div>
      </footer>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
