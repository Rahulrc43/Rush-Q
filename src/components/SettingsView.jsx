import React from 'react';

export default function SettingsView() {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-12 border-t border-[var(--color-obsidian-ink)] pt-8">
      <div className="flex flex-col gap-8">
        <div className="border-b border-[var(--color-obsidian-ink)] pb-4">
          <h2 className="font-editorial text-display-sm text-[var(--color-obsidian-ink)] leading-none flex items-center gap-4">
            <span className="material-symbols-outlined text-[32px] text-[var(--color-obsidian-ink)]">settings</span> Settings
          </h2>
        </div>

        <div className="flex flex-col gap-12">
          <div className="flex flex-col gap-6">
            <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-[var(--color-sage)]">API Configurations</label>
            <div className="border border-[var(--color-obsidian-ink)] bg-[var(--color-linen)] p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[var(--color-mist)] pb-4">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-[24px] text-[var(--color-sage)]">key</span>
                  <div>
                    <div className="text-[15px] font-bold text-[var(--color-obsidian-ink)] uppercase tracking-widest">Gemini AI Key</div>
                    <div className="text-[13px] text-[var(--color-sage)] mt-1">Used for Autopilot & Voice capabilities</div>
                  </div>
                </div>
                <button className="ghost-link text-[11px] uppercase tracking-widest font-bold">
                  Manage Keys
                </button>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-[24px] text-[var(--color-sage)]">calendar_month</span>
                  <div>
                    <div className="text-[15px] font-bold text-[var(--color-obsidian-ink)] uppercase tracking-widest">Google Calendar Integration</div>
                    <div className="text-[13px] text-[var(--color-sage)] mt-1">Sync tasks and blocks seamlessly</div>
                  </div>
                </div>
                <button className="ghost-link text-[11px] uppercase tracking-widest font-bold">
                  Connect
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-6">
            <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-[var(--color-sage)]">Appearance</label>
            <div className="border border-[var(--color-obsidian-ink)] bg-[var(--color-linen)] p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[24px] text-[var(--color-sage)]">newspaper</span>
                <div>
                  <div className="text-[15px] font-bold text-[var(--color-obsidian-ink)] uppercase tracking-widest">Broadsheet Redesign</div>
                  <div className="text-[13px] text-[var(--color-sage)] mt-1">Force high-contrast editorial UI</div>
                </div>
              </div>
              <span className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-voltage)] border border-[var(--color-voltage)] px-2 py-1">ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
