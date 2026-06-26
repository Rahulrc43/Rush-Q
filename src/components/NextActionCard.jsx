import React, { useState } from 'react';

export default function NextActionCard({ tasks, userEnergy, onStartFocus, onStartAutopilot }) {
  const [showReasoning, setShowReasoning] = useState(false);

  const getTaskMetrics = (task) => {
    const now = new Date();
    const deadline = new Date(task.deadline);
    const hoursLeft = Math.max(0.1, (deadline - now) / (1000 * 60 * 60));
    
    const deadlineWeight = 100 * Math.exp(-hoursLeft / 16);
    const importanceWeight = task.importance * 8;
    
    let difficultyWeight = task.difficulty * 2;
    if (userEnergy === 'low') difficultyWeight = task.difficulty * 6;
    else if (userEnergy === 'high') difficultyWeight = task.difficulty * 1;
    
    const timeWeight = Math.min(15, task.estHours * 3);
    const totalScore = Math.min(100, Math.round(deadlineWeight + importanceWeight + difficultyWeight + timeWeight));

    return {
      hoursLeft,
      deadlineWeight: Math.round(deadlineWeight),
      importanceWeight,
      difficultyWeight,
      timeWeight,
      totalScore
    };
  };

  const getNextBestAction = () => {
    const activeTasks = tasks.filter(t => !t.completed);
    if (activeTasks.length === 0) return null;

    const scoredTasks = activeTasks.map(t => {
      const metrics = getTaskMetrics(t);
      return { ...t, metrics, score: metrics.totalScore };
    });

    scoredTasks.sort((a, b) => b.score - a.score);
    return scoredTasks[0];
  };

  const nextAction = getNextBestAction();

  if (!nextAction) {
    return (
      <div className="border border-[var(--color-obsidian-ink)] p-8 flex items-center gap-4 border-l-8">
        <span className="material-symbols-outlined text-[var(--color-obsidian-ink)]">check_circle</span>
        <div>
          <h3 className="font-editorial text-[24px] text-[var(--color-obsidian-ink)] font-bold">Next Best Action Mode</h3>
          <p className="text-[16px] text-[var(--color-sage)] mt-2">All clear! No urgent targets detected on your radar.</p>
        </div>
      </div>
    );
  }

  const m = nextAction.metrics;
  const isAutopilotSupported = nextAction.title.toLowerCase().includes('report') || 
                               nextAction.title.toLowerCase().includes('write') || 
                               nextAction.title.toLowerCase().includes('pay') || 
                               nextAction.title.toLowerCase().includes('bill');

  return (
    <div className="border border-[var(--color-obsidian-ink)] p-8 flex flex-col gap-6 relative group">
      
      <div className="flex justify-between items-start border-b border-[var(--color-obsidian-ink)] pb-6">
        <div className="flex items-start gap-6">
          <div className="w-12 h-12 border border-[var(--color-obsidian-ink)] flex items-center justify-center text-[var(--color-obsidian-ink)] flex-shrink-0">
            <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-[var(--color-voltage)] tracking-widest uppercase font-bold">Recommended Action</span>
            <h3 className="font-editorial text-[48px] md:text-[64px] text-[var(--color-obsidian-ink)] leading-none">{nextAction.title}</h3>
            <p className="text-[14px] text-[var(--color-sage)] font-medium mt-2">
              Due in {m.hoursLeft < 1 ? 'less than an hour' : `${Math.round(m.hoursLeft)} hours`} (Est. focus requirement: {nextAction.estHours}h).
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 text-right">
          <span className="text-[11px] uppercase tracking-widest text-[var(--color-sage)] font-bold">
            Priority Score
          </span>
          <span className="text-[40px] font-editorial text-[var(--color-obsidian-ink)] leading-none">{nextAction.score}</span>
        </div>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => onStartFocus(nextAction)}
          className="voltage-btn text-[13px]"
        >
          <span className="material-symbols-outlined text-[18px]">play_arrow</span> Start Focus
        </button>
        {isAutopilotSupported && (
          <button 
            onClick={() => onStartAutopilot(nextAction)}
            className="ghost-link border border-[var(--color-obsidian-ink)] px-6 py-3 uppercase tracking-widest font-bold flex items-center gap-2 text-[11px]"
          >
            <span className="material-symbols-outlined text-[16px]">smart_toy</span> Autopilot Run
          </button>
        )}
      </div>

      <div className="border-t border-[var(--color-mist)] pt-6 mt-4">
        <button 
          className="ghost-link text-[11px] uppercase tracking-widest text-[var(--color-sage)] flex items-center gap-2"
          onClick={() => setShowReasoning(!showReasoning)}
        >
          <span className="material-symbols-outlined text-[16px]">
            {showReasoning ? 'expand_less' : 'expand_more'}
          </span>
          {showReasoning ? 'Hide reasoning' : 'View computation reasoning'}
        </button>

        {showReasoning && (
          <div className="border border-[var(--color-mist)] p-6 mt-6 bg-[var(--color-pollen)] bg-opacity-20 flex flex-col gap-4 text-[13px] text-[var(--color-obsidian-ink)]">
            <div className="font-bold flex items-center gap-2 uppercase tracking-widest text-[11px]">
              <span className="material-symbols-outlined text-[14px]">memory</span> Score Engine Computation Ledger
            </div>
            <div className="flex flex-col gap-3 font-mono">
              <div className="flex items-baseline justify-between gap-4">
                <span>Deadline decay urgency</span>
                <span className="font-bold">+{m.deadlineWeight}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span>Importance magnitude multiplier</span>
                <span className="font-bold">+{m.importanceWeight}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span>Complexity penalty (Energy state)</span>
                <span className="font-bold">+{m.difficultyWeight}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span>Focus duration weight</span>
                <span className="font-bold">+{Math.round(m.timeWeight)}</span>
              </div>
              <div className="border-t border-[var(--color-mist)] my-2"></div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-bold uppercase font-sans tracking-widest text-[11px]">Aggregated Priority Score</span>
                <span className="font-bold text-[16px] text-[var(--color-obsidian-ink)]">{nextAction.score} / 100</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
