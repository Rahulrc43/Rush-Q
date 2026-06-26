import React from 'react';

export default function HelpView() {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-12 border-t border-[var(--color-obsidian-ink)] pt-8">
      <div className="flex flex-col gap-8">
        <div className="border-b border-[var(--color-obsidian-ink)] pb-4">
          <h2 className="font-editorial text-display-sm text-[var(--color-obsidian-ink)] leading-none flex items-center gap-4">
            <span className="material-symbols-outlined text-[32px] text-[var(--color-obsidian-ink)]">help</span> Help & Resources
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border border-[var(--color-obsidian-ink)] p-8 bg-[var(--color-linen)] flex flex-col gap-4">
            <span className="material-symbols-outlined text-[var(--color-obsidian-ink)] text-[32px] mb-2">smart_toy</span>
            <h3 className="font-sans text-[16px] uppercase tracking-widest font-bold text-[var(--color-obsidian-ink)]">Autopilot Agent</h3>
            <p className="font-mono text-[13px] text-[var(--color-obsidian-ink)] leading-relaxed">
              Delegating a task to the AI Agent allows it to read files, run scripts, and browse the web on your behalf. Keep an eye on the terminal to oversee its progress.
            </p>
          </div>
          
          <div className="border border-[var(--color-obsidian-ink)] p-8 bg-[var(--color-linen)] flex flex-col gap-4">
            <span className="material-symbols-outlined text-[var(--color-obsidian-ink)] text-[32px] mb-2">timer</span>
            <h3 className="font-sans text-[16px] uppercase tracking-widest font-bold text-[var(--color-obsidian-ink)]">Focus Shield</h3>
            <p className="font-mono text-[13px] text-[var(--color-obsidian-ink)] leading-relaxed">
              Use Focus Mode to enter a distraction-free flow state. The ambient Theta beat synthesizer is tuned to 200Hz to naturally encourage deep concentration.
            </p>
          </div>

          <div className="border border-[var(--color-obsidian-ink)] p-8 bg-[var(--color-linen)] flex flex-col gap-4">
            <span className="material-symbols-outlined text-[var(--color-obsidian-ink)] text-[32px] mb-2">calendar_month</span>
            <h3 className="font-sans text-[16px] uppercase tracking-widest font-bold text-[var(--color-obsidian-ink)]">Calendar Sync</h3>
            <p className="font-mono text-[13px] text-[var(--color-obsidian-ink)] leading-relaxed">
              Syncing tasks will push them directly to your connected Google Calendar as 1-hour focus blocks, making sure your time is explicitly reserved.
            </p>
          </div>

          <div className="border border-[var(--color-obsidian-ink)] p-8 bg-[var(--color-linen)] flex flex-col gap-4">
            <span className="material-symbols-outlined text-[var(--color-obsidian-ink)] text-[32px] mb-2">mic</span>
            <h3 className="font-sans text-[16px] uppercase tracking-widest font-bold text-[var(--color-obsidian-ink)]">Voice Commands</h3>
            <p className="font-mono text-[13px] text-[var(--color-obsidian-ink)] leading-relaxed">
              Tap the microphone in the Voice tab to quickly log tasks, update priorities, or request rescheduling without touching your keyboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
