import React from 'react';

export default function GoalTracker({ habits, setHabits, tasks, addToast }) {
  
  const completeHabit = (id) => {
    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        const nextComp = !h.completed;
        const nextStreak = nextComp ? h.streak + 1 : Math.max(0, h.streak - 1);
        if (nextComp) {
          addToast(`Habit locked! Streak: ${nextStreak} days.`, 'safe');
        }
        return { ...h, completed: nextComp, streak: nextStreak };
      }
      return h;
    }));
  };

  const calculateClarityScore = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    
    const totalHabits = habits.length;
    const completedHabits = habits.filter(h => h.completed).length;

    const total = totalTasks + totalHabits;
    if (total === 0) return 100;
    
    return Math.round(((completedTasks + completedHabits) / total) * 100);
  };

  const clarityScore = calculateClarityScore();

  const historyTrend = [
    { day: 'Mon', score: 78 },
    { day: 'Tue', score: 82 },
    { day: 'Wed', score: 68 },
    { day: 'Thu', score: 88 },
    { day: 'Today', score: clarityScore }
  ];

  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clarityScore / 100) * circumference;

  return (
    <div className="flex flex-col gap-6 border-t border-[var(--color-obsidian-ink)] pt-6">
      <div className="flex flex-col gap-2 mb-2">
        <h2 className="font-editorial text-[32px] text-[var(--color-obsidian-ink)] leading-none flex items-center gap-3">
          <span className="material-symbols-outlined text-[28px] text-[var(--color-obsidian-ink)] leading-none">award_star</span> Operational Protocols
        </h2>
        <p className="font-sans text-[11px] uppercase tracking-widest text-[var(--color-sage)] max-w-sm leading-relaxed font-bold">
          Daily repeating protocols that maintain system integrity and personal energy levels.
        </p>
      </div>

      <div className="flex items-center gap-6 border border-[var(--color-obsidian-ink)] p-6 bg-[var(--color-linen)]">
        <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg style={{ width: '64px', height: '64px', transform: 'rotate(-90deg)' }}>
            <circle
              cx="32"
              cy="32"
              r={28}
              stroke="var(--color-mist)"
              strokeWidth="4"
              fill="transparent"
            />
            <circle
              cx="32"
              cy="32"
              r={28}
              stroke="var(--color-voltage)"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 28}
              strokeDashoffset={2 * Math.PI * 28 - (clarityScore / 100) * (2 * Math.PI * 28)}
              strokeLinecap="square"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="font-editorial text-[20px] font-bold text-[var(--color-obsidian-ink)]">
            {clarityScore}%
          </div>
        </div>

        <div>
          <div className="font-sans text-[13px] font-bold uppercase tracking-widest text-[var(--color-sage)] mb-1">Daily Shield Integrity</div>
          <div className="text-[13px] text-[var(--color-obsidian-ink)]">
            {clarityScore === 100 ? 'Full operational shield. Excellent!' : 'Complete daily habits to power up.'}
          </div>
        </div>
      </div>

      <div className="border border-[var(--color-obsidian-ink)] p-5 bg-[var(--color-linen)]">
        <div className="flex justify-between items-center mb-3 border-b border-[var(--color-mist)] pb-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-sage)]">Weekly Sparkline</span>
        </div>
        <div className="flex justify-between items-end h-20 px-2 mt-4">
          {historyTrend.map((h, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 flex-grow">
              <div 
                style={{ 
                  width: '20px', 
                  height: `${Math.max(10, h.score)}%`, 
                  background: h.score >= 80 ? 'var(--color-voltage)' : 'var(--color-mist)',
                  border: '1px solid var(--color-obsidian-ink)',
                  borderBottom: 'none'
                }}
                className="transition-all duration-500"
              />
              <span className="text-[10px] font-sans font-bold text-[var(--color-obsidian-ink)] uppercase tracking-widest">
                {h.day}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col border-y border-[var(--color-obsidian-ink)]">
        {habits.map(habit => (
          <div
            key={habit.id}
            onClick={() => completeHabit(habit.id)}
            className={`flex justify-between items-center p-6 border-b border-[var(--color-mist)] last:border-b-0 cursor-pointer transition-colors ${habit.completed ? 'bg-[var(--color-pollen)] bg-opacity-20' : 'bg-transparent hover:bg-[var(--color-linen)]'}`}
          >
            <div className="flex items-center gap-4">
              <span className={`material-symbols-outlined text-[24px] ${habit.completed ? 'text-[var(--color-obsidian-ink)]' : 'text-[var(--color-sage)]'}`}>
                {habit.completed ? 'check_box' : 'check_box_outline_blank'}
              </span>
              <div>
                <div className={`font-editorial text-[20px] font-bold ${habit.completed ? 'text-[var(--color-obsidian-ink)] line-through opacity-70' : 'text-[var(--color-obsidian-ink)]'}`}>
                  {habit.name}
                </div>
                <div className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-sage)] mt-1">
                  Streak: {habit.streak} days
                </div>
              </div>
            </div>

            <span className={`text-[11px] uppercase font-bold tracking-widest ${habit.completed ? 'text-[var(--color-obsidian-ink)]' : 'text-[var(--color-sage)]'}`}>
              {habit.completed ? 'Completed' : 'Pending'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
