import React, { useState } from 'react';

export default function CalendarView({ tasks, setTasks, addToast }) {
  const [rippleLogs, setRippleLogs] = useState([]);
  
  const [freeBlocks, setFreeBlocks] = useState([
    { day: 'Mon', start: '09:00', end: '12:00', label: 'Morning Focus' },
    { day: 'Tue', start: '13:00', end: '16:00', label: 'Afternoon Focus' },
    { day: 'Wed', start: '09:00', end: '12:00', label: 'Midweek Focus' },
    { day: 'Thu', start: '14:00', end: '17:00', label: 'Thursday Focus' },
    { day: 'Fri', start: '10:00', end: '13:00', label: 'Friday Sprint' }
  ]);

  const daysList = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getTasksForDay = (day) => {
    return tasks.filter(t => {
      if (!t.scheduledTime) return false;
      const d = new Date(t.scheduledTime);
      const dayStr = d.toLocaleDateString([], { weekday: 'short' });
      return dayStr === day;
    });
  };

  const runAutoScheduler = () => {
    const activeTasks = [...tasks]
      .filter(t => !t.completed)
      .sort((a, b) => {
        return new Date(a.deadline) - new Date(b.deadline);
      });

    if (activeTasks.length === 0) {
      addToast('No active tasks to schedule.', 'safe');
      return;
    }

    const updatedTasks = tasks.map(t => ({ ...t }));
    const tempRippleLogs = [`[SCHED_INIT] Re-optimizing 7-day calendar spine...`];
    const occupiedSlots = [];
    let scheduledCount = 0;

    activeTasks.forEach((task) => {
      let isScheduled = false;
      const duration = task.estHours;

      for (let block of freeBlocks) {
        if (isScheduled) break;

        const startHour = parseInt(block.start.split(':')[0]);
        const endHour = parseInt(block.end.split(':')[0]);

        for (let h = startHour; h <= endHour - duration; h += 0.5) {
          const slotStart = h;
          const slotEnd = h + duration;

          const hasOverlap = occupiedSlots.some(occ => 
            occ.day === block.day &&
            !(slotEnd <= occ.startHour || slotStart >= occ.endHour)
          );

          if (!hasOverlap) {
            const today = new Date();
            const targetDayIndex = daysList.indexOf(block.day);
            const todayIndex = today.getDay() - 1;
            
            let daysToAdd = targetDayIndex - todayIndex;
            if (daysToAdd < 0) daysToAdd += 7;

            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + daysToAdd);
            targetDate.setHours(Math.floor(slotStart), (slotStart % 1) * 60, 0, 0);

            const deadline = new Date(task.deadline);
            if (targetDate > deadline) {
              continue;
            }

            occupiedSlots.push({ day: block.day, startHour: slotStart, endHour: slotEnd });
            
            const taskIndex = updatedTasks.findIndex(t => t.id === task.id);
            const prevScheduled = updatedTasks[taskIndex].scheduledTime;

            updatedTasks[taskIndex].scheduledTime = targetDate.toISOString();
            isScheduled = true;
            scheduledCount++;

            if (prevScheduled && new Date(prevScheduled).toISOString() !== targetDate.toISOString()) {
              const prevDateStr = new Date(prevScheduled).toLocaleDateString([], { weekday: 'short', hour: '2-digit' });
              const newDateStr = targetDate.toLocaleDateString([], { weekday: 'short', hour: '2-digit' });
              tempRippleLogs.push(
                `[RIPPLE] Shifted "${task.title}": Pushed from ${prevDateStr} to ${newDateStr} due to priority cascade.`
              );
            } else if (!prevScheduled) {
              tempRippleLogs.push(
                `[SLOT] Slotted "${task.title}" into ${block.day} at ${Math.floor(slotStart)}:${(slotStart % 1) * 60 === 0 ? '00' : '30'}.`
              );
            }
            break;
          }
        }
      }

      if (!isScheduled) {
        tempRippleLogs.push(`[CONFLICT] Failed to slot "${task.title}" — remaining free blocks exceed deadline!`);
      }
    });

    setTasks(updatedTasks);
    setRippleLogs(tempRippleLogs);
    addToast(`Calendar updated. Slotted ${scheduledCount} tasks.`, 'agent');
  };

  const getPriorityClass = (task) => {
    const hoursLeft = (new Date(task.deadline) - new Date()) / (1000 * 60 * 60);
    if (hoursLeft <= 12) return 'emergency';
    if (task.importance >= 4) return 'active';
    return 'safe';
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col gap-12 border-t border-[var(--color-obsidian-ink)] pt-8">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h2 className="font-editorial text-display text-[var(--color-obsidian-ink)] leading-none">
            Focus Scheduler
          </h2>
        </div>

        <button 
          className="voltage-btn text-[14px]"
          onClick={runAutoScheduler}
        >
          <span className="material-symbols-outlined text-[18px]">memory</span> Run Auto-Scheduler
        </button>
      </div>

      <div className="border border-[var(--color-obsidian-ink)] p-8">
        <span className="text-[11px] uppercase tracking-widest text-[var(--color-sage)] font-bold">Declared Free Blocks Feed</span>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
          {freeBlocks.map((b, idx) => (
            <span key={idx} className="text-[13px] border border-[var(--color-mist)] px-3 py-1.5 text-[var(--color-obsidian-ink)] font-medium flex items-center gap-2">
              <strong>{b.day}:</strong> {b.start}-{b.end}
            </span>
          ))}
        </div>
      </div>

      <div className="calendar-grid border-y border-[var(--color-obsidian-ink)]">
        {daysList.map((day, i) => {
          const dayTasks = getTasksForDay(day);
          
          return (
            <div key={i} className="calendar-day-cell border-r border-[var(--color-mist)] last:border-r-0 py-4 px-2">
              <div className="flex justify-between items-center border-b border-[var(--color-obsidian-ink)] pb-2 mb-4">
                <span className="font-editorial text-[24px] text-[var(--color-obsidian-ink)] font-bold">{day}</span>
              </div>

              <div className="flex flex-col gap-4 flex-grow">
                {dayTasks.map(task => (
                  <div
                    key={task.id}
                    className={`calendar-event border-l-2 p-3 font-medium bg-[var(--color-pollen)] bg-opacity-20 flex flex-col gap-1 border-[var(--color-obsidian-ink)]`}
                    title={`${task.title} (${task.estHours}h)`}
                  >
                    <span className="font-sans text-[11px] text-[var(--color-obsidian-ink)] font-bold uppercase tracking-widest">
                      {formatTime(task.scheduledTime)}
                    </span>
                    <span className="text-[13px] text-[var(--color-obsidian-ink)] leading-snug">
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {rippleLogs.length > 0 && (
        <div className="flex flex-col gap-4 mt-4">
          <span className="text-[11px] text-[var(--color-sage)] font-bold uppercase tracking-widest">AI Rescheduling Ripple Log</span>
          <div className="bg-[var(--color-linen)] border border-[var(--color-mist)] p-6 font-mono text-[13px] text-[var(--color-obsidian-ink)] max-h-48 overflow-y-auto space-y-2 leading-relaxed">
            {rippleLogs.map((log, idx) => {
              let type = 'info';
              if (log.includes('Shifted')) type = 'warn';
              if (log.includes('CONFLICT')) type = 'error';
              return (
                <div key={idx} className={`console-line ${type}`}>
                  {log}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
