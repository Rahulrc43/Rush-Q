import React, { useEffect, useState } from 'react';

const FEATURES = [
  { icon: 'auto_awesome', title: 'AI Priority Engine', desc: 'Exponential deadline decay scoring ranks every task in real-time so you always know what to do next.' },
  { icon: 'timer', title: 'Focus Shield', desc: 'Pomodoro timer with ambient 90Hz alpha-wave synthesis. Deep work, distraction free.' },
  { icon: 'mic', title: 'Voice Assistant', desc: 'Speak tasks, get status reports, and launch focus sessions — all hands free via Gemini NLU.' },
  { icon: 'smart_toy', title: 'Autonomous Autopilot', desc: 'Delegate tasks to the AI agent. It plans, reasons, and marks completion — no micromanaging.' },
  { icon: 'calendar_month', title: 'Smart Calendar', desc: 'Visualise your week at a glance. Deadlines plotted by urgency with colour-coded risk tiers.' },
  { icon: 'psychology', title: 'Cognitive Context', desc: 'Switch between Office, Home, and Transit modes. Scoring adapts to where and how you work.' },
];

const STATS = [
  { value: '100', suffix: 'pt', label: 'Priority Score Cap' },
  { value: '25', suffix: 'min', label: 'Focus Block Default' },
  { value: '200', suffix: 'Hz', label: 'Theta Wave Frequency' },
  { value: '∞', suffix: '', label: 'Autonomous Capacity' },
];

export default function HomePage({ onEnter, session }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className="min-h-screen bg-[var(--color-linen)] text-[var(--color-obsidian-ink)] font-sans"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* ── TOP NAV ── */}
      <header className="px-12 py-8 flex justify-between items-center border-b border-[var(--color-obsidian-ink)]">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-[var(--color-voltage)] border border-[var(--color-obsidian-ink)]"></div>
          <span className="font-sans text-[13px] uppercase tracking-widest font-bold">NewForm</span>
        </div>
        <div className="flex items-center gap-6">
          {session?.user ? (
            <span className="font-mono text-[11px] tracking-widest uppercase text-[var(--color-sage)]">
              {session.user.email}
            </span>
          ) : null}
          <button 
            className="voltage-btn text-[11px] py-3 px-6"
            onClick={onEnter}
          >
            {session?.user ? "Enter Dashboard" : "Launch Core"}
          </button>
        </div>
      </header>

      {/* ── HERO MASTHEAD ── */}
      <main className="px-12 py-24 border-b border-[var(--color-obsidian-ink)]">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 gap-12 mt-20">
            <div className="flex flex-col gap-12">
              <h1 className="font-editorial text-display-lg text-[var(--color-obsidian-ink)] leading-[0.85] tracking-[-0.04em] -ml-2 mb-12">
                Operational<br />
                <span className="italic font-light text-[var(--color-sage)] relative inline-block">
                  Intelligence
                  <div className="absolute -right-8 top-8 w-6 h-6 bg-[var(--color-voltage)] rounded-full animate-pulse-subtle"></div>
                </span><br />
                Platform<span className="text-[var(--color-voltage)]">.</span>
              </h1>

              <div className="flex flex-col md:flex-row items-start md:items-center gap-12 mt-8">
                <button 
                  onClick={onEnter}
                  className="voltage-btn text-[14px] md:text-[16px] px-8 py-4"
                >
                  <span className="material-symbols-outlined text-[20px]">terminal</span>
                  Enter Workspace
                </button>
                <p className="font-mono text-[14px] text-[var(--color-sage)] max-w-md leading-relaxed border-l-2 border-[var(--color-voltage)] pl-6">
                  NewForm dynamically prioritizes your tasks using exponential decay algorithms, protects your focus with ambient 200Hz theta waves, and executes autonomous agent workflows.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── STATS TICKER ── */}
      <section className="border-b border-[var(--color-obsidian-ink)] bg-[var(--color-pollen)] bg-opacity-20">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[var(--color-obsidian-ink)]">
          {STATS.map((s, i) => (
            <div key={i} className="p-12 flex flex-col items-center justify-center text-center">
              <div className="font-editorial text-[64px] font-bold text-[var(--color-obsidian-ink)] leading-none mb-2">
                {s.value}<span className="text-[32px] text-[var(--color-sage)] italic font-normal">{s.suffix}</span>
              </div>
              <div className="font-sans text-[11px] uppercase tracking-widest font-bold text-[var(--color-sage)]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="px-12 py-32 border-b border-[var(--color-obsidian-ink)]">
        <div className="max-w-[1400px] mx-auto">
          <div className="mb-24 flex flex-col md:flex-row justify-between items-end gap-8">
            <h2 className="font-editorial text-[80px] leading-[0.9] text-[var(--color-obsidian-ink)] max-w-3xl">
              Systems designed for <span className="italic text-[var(--color-sage)]">relentless</span> execution.
            </h2>
            <p className="font-mono text-[13px] text-[var(--color-sage)] max-w-sm uppercase tracking-widest leading-relaxed">
              Built for executives, founders, and anyone who can't afford to miss a beat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-24">
            {FEATURES.map((f, i) => (
              <FeatureCard key={i} icon={f.icon} title={f.title} desc={f.desc} />
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="px-12 py-32 bg-[var(--color-obsidian-ink)] text-[var(--color-linen)] flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 border border-[var(--color-linen)] flex items-center justify-center mb-12">
          <div className="w-8 h-8 bg-[var(--color-voltage)]"></div>
        </div>
        <h2 className="font-editorial text-display text-[var(--color-linen)] leading-[0.9] mb-8">
          Ready to take command?
        </h2>
        <p className="font-mono text-[16px] text-[var(--color-mist)] max-w-xl mb-12">
          No setup. No signup. Just open NewForm and start clearing your operational backlog immediately.
        </p>
        <button
          onClick={onEnter}
          className="voltage-btn text-[16px] py-6 px-12"
        >
          <span className="material-symbols-outlined text-[24px]">bolt</span>
          Initialize Terminal
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-12 py-8 flex flex-col md:flex-row items-center justify-between border-t border-[var(--color-obsidian-ink)] bg-[var(--color-linen)] font-mono text-[11px] uppercase tracking-widest text-[var(--color-sage)]">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-[var(--color-obsidian-ink)]"></div>
          <span className="font-bold text-[var(--color-obsidian-ink)]">NewForm</span>
          <span>· Operational Intelligence</span>
        </div>
        <span>System Version 2.0 · {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col gap-6 group cursor-pointer"
    >
      <div className={`w-16 h-16 border flex items-center justify-center transition-colors duration-300 ${
        hovered ? 'bg-[var(--color-voltage)] border-[var(--color-obsidian-ink)] text-[var(--color-obsidian-ink)]' : 'bg-transparent border-[var(--color-obsidian-ink)] text-[var(--color-obsidian-ink)]'
      }`}>
        <span className="material-symbols-outlined text-[32px]">{icon}</span>
      </div>
      <div>
        <div className="font-sans text-[16px] font-bold text-[var(--color-obsidian-ink)] uppercase tracking-widest mb-3">{title}</div>
        <div className="font-mono text-[13px] text-[var(--color-sage)] leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}
