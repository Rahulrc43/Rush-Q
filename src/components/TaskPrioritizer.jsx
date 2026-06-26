import React, { useState } from 'react';

export default function TaskPrioritizer({ 
  tasks, 
  setTasks, 
  userEnergy, 
  setUserEnergy, 
  onDelegate, 
  onSelectTask, 
  apiKey,
  showAddModal: propShowAddModal,
  setShowAddModal: propSetShowAddModal,
  onSyncTaskToCalendar,
  onSyncAllToCalendar,
  gcalConnected,
  gcalSyncing,
}) {
  const [localShowAddModal, setLocalShowAddModal] = useState(false);
  const showAddModal = propShowAddModal !== undefined ? propShowAddModal : localShowAddModal;
  const setShowAddModal = propSetShowAddModal !== undefined ? propSetShowAddModal : setLocalShowAddModal;
  const [newTitle, setNewTitle] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newImportance, setNewImportance] = useState(3);
  const [newDifficulty, setNewDifficulty] = useState(3);
  const [newEstHours, setNewEstHours] = useState(1);
  
  const [expandedTaskIds, setExpandedTaskIds] = useState({});

  const calculateRushScore = (task) => {
    if (task.completed) return 0;
    const now = new Date();
    const deadline = new Date(task.deadline);
    const hoursLeft = Math.max(0.1, (deadline - now) / (1000 * 60 * 60));
    
    const deadlineWeight = 100 * Math.exp(-hoursLeft / 16);
    const importanceWeight = task.importance * 8;
    
    let difficultyWeight = task.difficulty * 2;
    if (userEnergy === 'low') difficultyWeight = task.difficulty * 6;
    else if (userEnergy === 'high') difficultyWeight = task.difficulty * 1;
    
    const timeWeight = Math.min(15, task.estHours * 3);
    return Math.min(100, Math.round(deadlineWeight + importanceWeight + difficultyWeight + timeWeight));
  };

  const getPriorityZone = (score, hoursLeft) => {
    if (score >= 75 || hoursLeft <= 12) return 'emergency';
    if (score >= 40) return 'active';
    return 'safe';
  };

  const getConflictAlert = () => {
    const activeTasks = [...tasks]
      .filter(t => !t.completed)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    
    let cumulativeHours = 0;
    for (let t of activeTasks) {
      cumulativeHours += t.estHours;
      const hoursLeft = (new Date(t.deadline) - new Date()) / (1000 * 60 * 60);
      if (cumulativeHours > hoursLeft) {
        return {
          taskName: t.title,
          requiredHours: cumulativeHours.toFixed(1),
          availableHours: Math.max(0, Math.round(hoursLeft))
        };
      }
    }
    return null;
  };

  const conflict = getConflictAlert();

  const sortedTasks = tasks
    .map(t => {
      const hoursLeft = Math.max(0, (new Date(t.deadline) - new Date()) / (1000 * 60 * 60));
      const score = calculateRushScore(t);
      return { ...t, rushScore: score, hoursLeft, zone: getPriorityZone(score, hoursLeft) };
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return b.rushScore - a.rushScore;
    });

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDeadline) return;

    const newTask = {
      id: crypto.randomUUID(),
      title: newTitle,
      deadline: newDeadline,
      importance: parseInt(newImportance),
      difficulty: parseInt(newDifficulty),
      estHours: parseFloat(newEstHours),
      completed: false,
      scheduledTime: null,
      subtasks: []
    };

    setTasks([...tasks, newTask]);
    setNewTitle('');
    setNewDeadline('');
    setNewImportance(3);
    setNewDifficulty(3);
    setNewEstHours(1);
    setShowAddModal(false);
  };

  const toggleComplete = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const toggleExpand = (id) => {
    setExpandedTaskIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const decomposeTask = async (id, title) => {
    try {
      const res = await fetch('/api/ai/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Decomposition failed');
      
      const subtasksList = data.subtasks.map((item, idx) => ({
        id: `${id}-s${idx+1}`,
        title: item,
        completed: false
      }));
      
      setTasks(tasks.map(t => t.id === id ? { ...t, subtasks: subtasksList } : t));
      setExpandedTaskIds(prev => ({ ...prev, [id]: true }));
    } catch (e) {
      console.error("Task decomposition failed:", e.message);
      // Fallback
      const subtasksList = [
        { id: `${id}-s1`, title: 'Compile initial references and core scope outline', completed: false },
        { id: `${id}-s2`, title: 'Synthesize data logs and draft structural body blocks', completed: false },
        { id: `${id}-s3`, title: 'Perform QA review layer and complete target documentation', completed: false }
      ];
      setTasks(tasks.map(t => t.id === id ? { ...t, subtasks: subtasksList } : t));
      setExpandedTaskIds(prev => ({ ...prev, [id]: true }));
    }
  };

  const toggleSubtask = (taskId, subtaskId) => {
    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        const updatedSubs = t.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
        return { ...t, subtasks: updatedSubs };
      }
      return t;
    }));
  };

  const formatDeadline = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-start border-b border-[var(--color-mist)] pb-4 mb-4">
        <div className="flex flex-col gap-2">
          <h2 className="font-editorial text-[32px] text-[var(--color-obsidian-ink)] leading-none">
            Tactical Action Matrix
          </h2>
          <p className="font-sans text-[11px] uppercase tracking-widest text-[var(--color-sage)] max-w-sm leading-relaxed font-bold">
            Your raw task data, algorithmically sorted by proximity to deadline, energy level, and operational importance.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-widest text-[var(--color-sage)] font-bold">Energy:</span>
            <select
              value={userEnergy}
              onChange={(e) => setUserEnergy(e.target.value)}
              className="bg-transparent border-none outline-none p-0 focus:ring-0 text-[11px] uppercase tracking-widest text-[var(--color-obsidian-ink)] font-bold cursor-pointer"
            >
              <option value="high">High</option>
              <option value="medium">Standard</option>
              <option value="low">Low</option>
            </select>
          </div>

          {onSyncAllToCalendar && (
            <button
              className="ghost-link text-[11px] uppercase tracking-widest flex items-center gap-1"
              onClick={onSyncAllToCalendar}
              disabled={gcalSyncing}
            >
              {gcalSyncing ? 'Syncing...' : (gcalConnected ? 'Sync All' : 'GCal')}
            </button>
          )}

          <button 
            className="voltage-btn whitespace-nowrap"
            onClick={() => setShowAddModal(true)}
          >
            Declare Target
          </button>
        </div>
      </div>

      <div className="flex flex-col border-t border-[var(--color-obsidian-ink)] pt-4 gap-4">
        {sortedTasks.length === 0 ? (
          <div className="text-[var(--color-sage)] text-sm py-12 italic border-b border-[var(--color-mist)]">
            No targets detected on the radar.
          </div>
        ) : (
          sortedTasks.map(task => {
            const isExpanded = !!expandedTaskIds[task.id];
            
            return (
              <div key={task.id} className="flex flex-col border-b border-[var(--color-mist)] pb-4 group">
                <div
                  className={`flex justify-between items-start cursor-pointer ${task.completed ? 'opacity-50' : ''}`}
                  onClick={() => onSelectTask(task)}
                >
                  <div className="flex items-start gap-4 flex-grow">
                    <button
                      className="mt-1 flex-shrink-0 focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleComplete(task.id);
                      }}
                    >
                      {task.completed ? (
                        <div className="w-4 h-4 bg-[var(--color-voltage)] flex items-center justify-center border border-[var(--color-obsidian-ink)]">
                           <span className="font-bold text-[10px] text-[var(--color-obsidian-ink)] leading-none mt-[-1px]">✓</span>
                        </div>
                      ) : (
                        <div className="w-4 h-4 border border-[var(--color-obsidian-ink)] group-hover:border-[var(--color-voltage)] transition-colors bg-[var(--color-linen)]"></div>
                      )}
                    </button>

                    <div className="flex flex-col">
                      <div className={`text-[16px] text-[var(--color-obsidian-ink)] font-[550] leading-tight ${task.completed ? 'line-through decoration-[var(--color-sage)]' : ''}`}>
                        {task.title}
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`text-[11px] uppercase tracking-widest font-bold ${task.hoursLeft <= 12 && !task.completed ? 'text-[var(--color-voltage)]' : 'text-[var(--color-sage)]'}`}>
                          {task.completed ? 'Completed' : `Due: ${formatDeadline(task.deadline)}`}
                        </span>
                        <span className="text-[11px] uppercase tracking-widest text-[var(--color-sage)]">
                          Time: {task.estHours}h
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="ghost-link text-[11px] uppercase tracking-widest text-[var(--color-sage)] hover:text-[var(--color-obsidian-ink)]"
                      onClick={() => toggleExpand(task.id)}
                    >
                      {isExpanded ? 'Hide' : 'Plan'}
                    </button>

                    {!task.completed && (
                      <button 
                        className="ghost-link text-[11px] uppercase tracking-widest text-[var(--color-voltage)]"
                        onClick={() => decomposeTask(task.id, task.title)}
                      >
                        AI
                      </button>
                    )}

                    <button
                      className="ghost-link text-[11px] uppercase tracking-widest text-red-600"
                      onClick={() => deleteTask(task.id)}
                    >
                      Drop
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 ml-8 pl-4 border-l border-[var(--color-mist)] flex flex-col gap-2">
                    {task.subtasks.length === 0 ? (
                      <div className="text-[11px] text-[var(--color-sage)] flex justify-between items-center">
                        <span className="italic">No plan generated.</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-[10px] uppercase tracking-widest text-[var(--color-sage)] font-bold mb-2">Operational Plan</span>
                        {task.subtasks.map(sub => (
                          <div 
                            key={sub.id} 
                            className="flex items-center gap-3 cursor-pointer group/sub"
                            onClick={() => toggleSubtask(task.id, sub.id)}
                          >
                            <button className="flex-shrink-0 focus:outline-none">
                              {sub.completed ? (
                                <div className="w-3 h-3 bg-[var(--color-voltage)] flex items-center justify-center">
                                  <span className="material-symbols-outlined text-[8px] text-[var(--color-obsidian-ink)] font-bold">check</span>
                                </div>
                              ) : (
                                <div className="w-3 h-3 border border-[var(--color-mist)] group-hover/sub:border-[var(--color-obsidian-ink)] transition-colors"></div>
                              )}
                            </button>
                            <span className={`text-[13px] ${sub.completed ? 'text-[var(--color-sage)] line-through' : 'text-[var(--color-obsidian-ink)]'}`}>
                              {sub.title}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-[var(--color-obsidian-ink)] bg-opacity-80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleAddTask} className="w-full max-w-lg bg-[var(--color-linen)] border border-[var(--color-obsidian-ink)] p-10 md:p-12 relative shadow-2xl animate-slide-up">
            <button 
              type="button" 
              className="absolute top-6 right-6 ghost-link text-[11px] uppercase tracking-widest text-[var(--color-sage)] font-bold flex items-center gap-1" 
              onClick={() => setShowAddModal(false)}
            >
              <span className="material-symbols-outlined text-[14px]">close</span> Close
            </button>
            
            <div className="mb-8 border-b border-[var(--color-mist)] pb-6 pr-12">
              <h3 className="font-editorial text-[48px] text-[var(--color-obsidian-ink)] leading-tight">
                Declare Target
              </h3>
            </div>

            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] uppercase tracking-widest text-[var(--color-sage)] font-bold">Target Description</label>
                <input
                  type="text"
                  placeholder="e.g. Compile market pricing draft"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-transparent border-b border-[var(--color-mist)] py-2 text-[16px] text-[var(--color-obsidian-ink)] focus:outline-none focus:border-[var(--color-voltage)] transition-colors placeholder:text-[var(--color-mist)]"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] uppercase tracking-widest text-[var(--color-sage)] font-bold">Hard Target Deadline</label>
                <input
                  type="datetime-local"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="bg-transparent border-b border-[var(--color-mist)] py-2 text-[16px] text-[var(--color-obsidian-ink)] focus:outline-none focus:border-[var(--color-voltage)] transition-colors"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] uppercase tracking-widest text-[var(--color-sage)] font-bold">Importance</label>
                  <select
                    value={newImportance}
                    onChange={(e) => setNewImportance(e.target.value)}
                    className="bg-transparent border-b border-[var(--color-mist)] py-2 text-[16px] text-[var(--color-obsidian-ink)] focus:outline-none focus:border-[var(--color-voltage)] transition-colors appearance-none cursor-pointer"
                  >
                    <option className="bg-[var(--color-linen)] text-[var(--color-obsidian-ink)]" value="1">1 - Minimal</option>
                    <option className="bg-[var(--color-linen)] text-[var(--color-obsidian-ink)]" value="2">2 - Low</option>
                    <option className="bg-[var(--color-linen)] text-[var(--color-obsidian-ink)]" value="3">3 - Normal</option>
                    <option className="bg-[var(--color-linen)] text-[var(--color-obsidian-ink)]" value="4">4 - High</option>
                    <option className="bg-[var(--color-linen)] text-[var(--color-obsidian-ink)]" value="5">5 - Critical</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] uppercase tracking-widest text-[var(--color-sage)] font-bold">Difficulty</label>
                  <select
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value)}
                    className="bg-transparent border-b border-[var(--color-mist)] py-2 text-[16px] text-[var(--color-obsidian-ink)] focus:outline-none focus:border-[var(--color-voltage)] transition-colors appearance-none cursor-pointer"
                  >
                    <option className="bg-[var(--color-linen)] text-[var(--color-obsidian-ink)]" value="1">1 - Cake Walk</option>
                    <option className="bg-[var(--color-linen)] text-[var(--color-obsidian-ink)]" value="2">2 - Easy</option>
                    <option className="bg-[var(--color-linen)] text-[var(--color-obsidian-ink)]" value="3">3 - Standard</option>
                    <option className="bg-[var(--color-linen)] text-[var(--color-obsidian-ink)]" value="4">4 - Complex</option>
                    <option className="bg-[var(--color-linen)] text-[var(--color-obsidian-ink)]" value="5">5 - Exhausting</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] uppercase tracking-widest text-[var(--color-sage)] font-bold">Estimated Focus Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={newEstHours}
                  onChange={(e) => setNewEstHours(e.target.value)}
                  className="bg-transparent border-b border-[var(--color-mist)] py-2 text-[16px] text-[var(--color-obsidian-ink)] focus:outline-none focus:border-[var(--color-voltage)] transition-colors"
                  required
                />
              </div>

              <button type="submit" className="voltage-btn justify-center mt-4 text-[14px] w-auto inline-flex self-start">
                Commit Target
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
