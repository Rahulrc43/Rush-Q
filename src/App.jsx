import React, { useState, useEffect, useRef } from 'react';
import TaskPrioritizer from './components/TaskPrioritizer';
import CalendarView from './components/CalendarView';
import VoiceAssistant from './components/VoiceAssistant';
import AgentWorkspace from './components/AgentWorkspace';
import GoalTracker from './components/GoalTracker';
import NextActionCard from './components/NextActionCard';
import MissionControl3D from './components/MissionControl3D';
import NetworkBackground from './components/NetworkBackground';
import HomePage from './components/HomePage';
import AuthPage from './components/AuthPage';
import SettingsView from './components/SettingsView';
import HelpView from './components/HelpView';
import { initGoogleCalendar, requestCalendarAccess, pushTaskToCalendar, syncAllTasksToCalendar, hasCalendarAccess } from './utils/googleCalendar';

// Relative deadlines setup
const getInitialTasks = () => {
  const now = new Date();
  
  const t1 = new Date(now);
  t1.setHours(now.getHours() + 4);
  
  const t2 = new Date(now);
  t2.setHours(now.getHours() + 18);
  
  const t3 = new Date(now);
  t3.setDate(now.getDate() + 2);
  
  const t4 = new Date(now);
  t4.setDate(now.getDate() + 3);

  return [
    { id: crypto.randomUUID(), title: 'Write competitor SaaS pricing report', deadline: t1.toISOString(), importance: 5, difficulty: 4, estHours: 1.5, completed: false, scheduledTime: null, subtasks: [], gcalEventId: null },
    { id: crypto.randomUUID(), title: 'Pay home electricity utility bill', deadline: t2.toISOString(), importance: 4, difficulty: 2, estHours: 0.5, completed: false, scheduledTime: null, subtasks: [], gcalEventId: null },
    { id: crypto.randomUUID(), title: 'Submit chemistry assignment lab notes', deadline: t3.toISOString(), importance: 3, difficulty: 5, estHours: 3.0, completed: false, scheduledTime: null, subtasks: [], gcalEventId: null },
    { id: crypto.randomUUID(), title: 'Schedule dental checkup consultation', deadline: t4.toISOString(), importance: 2, difficulty: 2, estHours: 1.0, completed: false, scheduledTime: null, subtasks: [], gcalEventId: null }
  ];
};

const initialHabits = [
  { id: crypto.randomUUID(), name: 'Read technical docs / articles', streak: 4, completed: false },
  { id: crypto.randomUUID(), name: 'Write modular code blocks', streak: 12, completed: true },
  { id: crypto.randomUUID(), name: 'Stand & stretch every 50m', streak: 0, completed: false }
];

export default function App() {
  // ── Auth state ───────────────────────────────────────────────────────────
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [guestMode, setGuestMode] = useState(false);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [showHome, setShowHome] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tasks, setTasks] = useState(getInitialTasks());
  const [habits, setHabits] = useState(initialHabits);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userEnergy, setUserEnergy] = useState('medium');
  const [userContext, setUserContext] = useState('office');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'

  // Ref for tracking previous tasks/habits for diffing
  const prevTasksRef = useRef(null);
  const prevHabitsRef = useRef(null);
  const syncTimerRef = useRef(null);
  // Prevent duplicate loads when SIGNED_IN fires multiple times
  const loadedUidRef = useRef(null);

  // Gate: only sync AFTER we've loaded from DB (prevents overwriting cloud with local defaults)
  const [dbLoaded, setDbLoaded] = useState(false);

  // ── Google Calendar state ────────────────────────────────────────────────
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalSyncing, setGcalSyncing] = useState(false);
  
  // Autopilot states
  const [activeAgentTask, setActiveAgentTask] = useState(null);
  
  // Side-drawer detail focus state (triggered from 3D timeline click)
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);
  
  const [toasts, setToasts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Focus Mode states
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusTimeLeft, setFocusTimeLeft] = useState(1500); // 25 mins
  const [isFocusTimerRunning, setIsFocusTimerRunning] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  
  const focusIntervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const oscNodeRef = useRef(null);
  const gainNodeRef = useRef(null);

  // ── Session check on mount ───────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          console.log('[Rush-Q Auth] Session restored:', data.user.email);
          setSession({ user: data.user });
        } else {
          setSession(null);
        }
      })
      .catch(err => {
        console.error('Session check failed', err);
        setSession(null);
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  // ── Load data from backend on login (runs ONCE per user) ──────────────────
  useEffect(() => {
    if (!session) {
      setTasks(getInitialTasks());
      setHabits(initialHabits);
      setDbLoaded(false);
      loadedUidRef.current = null;
      return;
    }
    
    const uid = session.user.id;
    if (loadedUidRef.current === uid) return;
    loadedUidRef.current = uid;

    setDbLoaded(false);

    const loadAll = async () => {
      try {
        const [tasksRes, habitsRes] = await Promise.all([
          fetch('/api/tasks'),
          fetch('/api/habits')
        ]);
        
        if (!tasksRes.ok || !habitsRes.ok) throw new Error('Failed to load data from server');
        
        const taskData = await tasksRes.json();
        const habitData = await habitsRes.json();

        if (taskData && taskData.length > 0) {
          setTasks(taskData.map(t => ({...t, estHours: t.est_hours, scheduledTime: t.scheduled_time, gcalEventId: t.gcal_event_id})));
          prevTasksRef.current = taskData;
        } else {
          const demos = getInitialTasks();
          await fetch('/api/tasks/bulk', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ tasks: demos }) });
          setTasks(demos);
          prevTasksRef.current = demos;
        }

        if (habitData && habitData.length > 0) {
          setHabits(habitData);
          prevHabitsRef.current = habitData;
        } else {
          await fetch('/api/habits/bulk', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ habits: initialHabits }) });
          setHabits(initialHabits);
          prevHabitsRef.current = initialHabits;
        }

        setDbLoaded(true);
      } catch (err) {
        console.error('[Rush-Q] Load error:', err);
        setDbLoaded(true);
      }
    };

    loadAll();
  }, [session]);

  // ── Task sync to Backend (only after DB loaded) ─────────────────────────
  useEffect(() => {
    // Hard gate: never sync before DB data is loaded
    if (!session || !dbLoaded) return;

    const old = prevTasksRef.current;
    prevTasksRef.current = tasks;

    // Skip if nothing changed
    if (old && JSON.stringify(old) === JSON.stringify(tasks)) return;
    if (!old) return; // first run after load — skip

    clearTimeout(syncTimerRef.current);
    setSyncStatus('syncing');

    syncTimerRef.current = setTimeout(async () => {
      try {
        const oldIds = new Set((old || []).map(t => t.id));
        const newIds = new Set(tasks.map(t => t.id));

        // Handle deleted tasks
        for (const id of oldIds) {
          if (!newIds.has(id)) {
            const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
          }
        }

        // Handle added or updated tasks
        for (const task of tasks) {
          const wasOld = (old || []).find(t => t.id === task.id);
          if (!wasOld || JSON.stringify(wasOld) !== JSON.stringify(task)) {
            const payload = {
              id: task.id, title: task.title, deadline: task.deadline,
              importance: task.importance, difficulty: task.difficulty,
              est_hours: task.estHours, completed: task.completed,
              scheduled_time: task.scheduledTime, subtasks: task.subtasks || [],
              gcal_event_id: task.gcalEventId || null
            };
            const method = wasOld ? 'PUT' : 'POST';
            const endpoint = wasOld ? `/api/tasks/${task.id}` : '/api/tasks';
            const res = await fetch(endpoint, {
              method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Upsert failed');
          }
        }

        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } catch (err) {
        console.error('[Rush-Q Sync Error]', err);
        setSyncStatus('error');
        const msg = err?.message || JSON.stringify(err);
        setToasts(prev => [...prev, {
          id: Date.now().toString(),
          message: `☁️ Sync failed: ${msg}`,
          type: 'emergency'
        }]);
        setTimeout(() => setSyncStatus('idle'), 4000);
      }
    }, 800);
  }, [tasks, session, dbLoaded]);

  // ── Habit sync to Supabase (only after DB loaded) ───────────────────────
  useEffect(() => {
    if (!session || !dbLoaded) return;

    const old = prevHabitsRef.current;
    prevHabitsRef.current = habits;

    if (old && JSON.stringify(old) === JSON.stringify(habits)) return;
    if (!old) return;

    const uid = session.user.id;
    setTimeout(async () => {
      try {
        for (const habit of habits) {
          const wasOld = (old || []).find(h => h.id === habit.id);
          if (!wasOld || JSON.stringify(wasOld) !== JSON.stringify(habit)) {
            const { error } = await supabase.from('habits').upsert(mapHabitToDb(habit, uid), { onConflict: 'id' });
            if (error) throw error;
          }
        }
        console.log('[Rush-Q] Habits synced ✓');
      } catch (err) {
        console.error('[Rush-Q Habit Sync Error]', err);
      }
    }, 800);
  }, [habits, session, dbLoaded]);

  // ── Service worker registration ──────────────────────────────────────────
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ── Deadline push notification watcher (every 60s) ───────────────────────
  useEffect(() => {
    const check = () => {
      if (Notification.permission !== 'granted') return;
      tasks.forEach(task => {
        if (task.completed) return;
        const hoursLeft = (new Date(task.deadline) - new Date()) / 3600000;
        if (hoursLeft > 0 && hoursLeft <= 1) {
          new Notification('⚡ Rush-Q Deadline Alert', {
            body: `"${task.title}" is due in ${Math.round(hoursLeft * 60)} minutes!`,
            icon: '/favicon.svg',
            tag: `task-${task.id}`,
          });
        }
      });
    };
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [tasks]);

  // ── Google Calendar init (waits for GIS script to load) ─────────────────
  useEffect(() => {
    let attempts = 0;
    const tryInit = () => {
      if (typeof window.google !== 'undefined' && window.google.accounts) {
        initGoogleCalendar()
          .then(() => setGcalConnected(hasCalendarAccess()))
          .catch(() => {});
      } else if (attempts < 20) {
        attempts++;
        setTimeout(tryInit, 500);
      }
    };
    tryInit();
  }, []);

  // ── Sync single task to Google Calendar ─────────────────────────────────
  const syncTaskToCalendar = async (task) => {
    try {
      setGcalSyncing(true);
      if (!hasCalendarAccess()) {
        addToast('Connecting to Google Calendar...', 'info');
        await requestCalendarAccess();
        setGcalConnected(true);
      }
      const eventId = await pushTaskToCalendar(task);
      // Save the gcalEventId back to the task
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, gcalEventId: eventId } : t
      ));
      addToast(`"${task.title}" added to Google Calendar ✓`, 'safe');
    } catch (err) {
      addToast(`Calendar sync failed: ${err.message}`, 'emergency');
    } finally {
      setGcalSyncing(false);
    }
  };

  // ── Bulk sync all active tasks to Google Calendar ───────────────────────
  const syncAllToCalendar = async () => {
    try {
      setGcalSyncing(true);
      if (!hasCalendarAccess()) {
        addToast('Connecting to Google Calendar...', 'info');
        await requestCalendarAccess();
        setGcalConnected(true);
      }
      addToast('Syncing all tasks to Google Calendar...', 'info');
      const results = await syncAllTasksToCalendar(tasks);
      // Update gcalEventIds on all tasks
      const idMap = {};
      results.forEach(r => { if (r.success) idMap[r.taskId] = r.gcalEventId; });
      setTasks(prev => prev.map(t =>
        idMap[t.id] ? { ...t, gcalEventId: idMap[t.id] } : t
      ));
      const ok = results.filter(r => r.success).length;
      addToast(`${ok} of ${results.length} tasks synced to Google Calendar ✓`, 'safe');
    } catch (err) {
      addToast(`Calendar sync failed: ${err.message}`, 'emergency');
    } finally {
      setGcalSyncing(false);
    }
  };

  const addToast = (message, type = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    if (type === 'emergency' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('⚡ Rush-Q Alert', { body: message, icon: '/favicon.svg' });
    }
    setTimeout(() => { 
      setToasts(prev => prev.filter(t => t.id !== id)); 
    }, 5000);
  };

  const handleContextChange = (newContext) => {
    setUserContext(newContext);
    
    // Trigger context alert notifications
    if (newContext === 'office') {
      const officeTask = tasks.find(t => !t.completed && (t.title.toLowerCase().includes('report') || t.title.toLowerCase().includes('write')));
      if (officeTask) {
        addToast(`[Office Context Mode] Found focus target: "${officeTask.title}". Auto-scheduling recommended.`, 'emergency');
      }
    } else if (newContext === 'home') {
      const homeTask = tasks.find(t => !t.completed && (t.title.toLowerCase().includes('bill') || t.title.toLowerCase().includes('pay')));
      if (homeTask) {
        addToast(`[Home Context Mode] Warning: outstanding invoice discovered. "${homeTask.title}" needs clearance.`, 'active');
      }
    }
  };

  // Browser synthesized ambient Alpha Focus sound
  const startAmbientSynth = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      // Triangle waves are much more audible on laptop speakers than pure sine waves
      osc1.type = 'triangle';
      osc2.type = 'triangle';
      
      // 200Hz and 204Hz creates a 4Hz Theta beat / vibration
      osc1.frequency.setValueAtTime(200, ctx.currentTime);
      osc2.frequency.setValueAtTime(204, ctx.currentTime); 
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc2.start();

      oscNodeRef.current = osc1;
      gainNodeRef.current = gain;
      setIsAudioPlaying(true);
      addToast('Ambient Theta beat synthesizer humming.', 'safe');
    } catch (e) {
      console.error(e);
    }
  };

  const stopAmbientSynth = () => {
    if (oscNodeRef.current) {
      oscNodeRef.current.stop();
      oscNodeRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setIsAudioPlaying(false);
  };

  // Pomodoro timer cycle loop
  useEffect(() => {
    if (isFocusTimerRunning) {
      focusIntervalRef.current = setInterval(() => {
        setFocusTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(focusIntervalRef.current);
            setIsFocusTimerRunning(false);
            stopAmbientSynth();
            addToast('Focus block completed! Shield deactivated.', 'safe');
            return 1500;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(focusIntervalRef.current);
    }
    return () => clearInterval(focusIntervalRef.current);
  }, [isFocusTimerRunning]);

  const toggleFocusTimer = () => {
    setIsFocusTimerRunning(!isFocusTimerRunning);
    if (!isFocusTimerRunning && !isAudioPlaying) {
      startAmbientSynth();
    } else if (isFocusTimerRunning && isAudioPlaying) {
      stopAmbientSynth();
    }
  };

  const handleAgentFinish = (taskId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true } : t));
    setActiveAgentTask(null);
  };

  const startAutopilotAgent = (task) => {
    setActiveAgentTask(task);
    setActiveTab('dashboard');
    addToast(`Autopilot Runway engaged: "${task.title}"`, 'agent');
  };

  // Find next best action to calculate primary glowing node ID
  const getNextBestActionId = () => {
    const activeTasks = tasks.filter(t => !t.completed);
    if (activeTasks.length === 0) return null;
    
    const scored = activeTasks.map(t => {
      const now = new Date();
      const deadline = new Date(t.deadline);
      const hoursLeft = Math.max(0.1, (deadline - now) / (1000 * 60 * 60));
      
      const deadlineWeight = 100 * Math.exp(-hoursLeft / 16);
      const importanceWeight = t.importance * 8;
      let difficultyWeight = t.difficulty * 2;
      if (userEnergy === 'low') difficultyWeight = t.difficulty * 6;
      else if (userEnergy === 'high') difficultyWeight = t.difficulty * 1;
      
      const timeWeight = Math.min(15, t.estHours * 3);
      const score = Math.round(deadlineWeight + importanceWeight + difficultyWeight + timeWeight);
      return { ...t, score };
    });

    scored.sort((a,b) => b.score - a.score);
    return scored[0].id;
  };

  const nextBestActionId = getNextBestActionId();

  // Filtered tasks based on search query
  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFocusTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Stats calculations
  const completedTasksCount = tasks.filter(t => t.completed).length;
  const completedHabitsCount = habits.filter(h => h.completed).length;
  const totalItemsCount = tasks.length + habits.length;
  const clarityScore = totalItemsCount > 0 
    ? Math.round(((completedTasksCount + completedHabitsCount) / totalItemsCount) * 100)
    : 100;

  const urgentCount = tasks.filter(t => {
    const hl = (new Date(t.deadline) - new Date()) / (1000 * 60 * 60);
    return !t.completed && hl <= 12;
  }).length;

  // ── Auth guard ───────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '3px solid #e2e2e3', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontSize: '14px', color: '#7e7576' }}>Loading Rush-Q...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session && !guestMode) {
    return <AuthPage onAuth={() => setGuestMode(true)} />;
  }

  if (showHome) {
    return <HomePage onEnter={() => setShowHome(false)} session={session} />;
  }

  return (
    <div className="min-h-screen bg-[var(--color-linen)] text-[var(--color-obsidian-ink)] font-sans select-none">
      {/* Toast Alert Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className="pointer-events-auto flex items-center gap-3 px-6 py-4 border border-[var(--color-obsidian-ink)] bg-[var(--color-linen)] text-[var(--color-obsidian-ink)] transition-all duration-300"
          >
            <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: t.type === 'emergency' ? 'var(--color-voltage)' : 'var(--color-obsidian-ink)'}}>
              {t.type === 'emergency' ? 'Error' : t.type === 'active' ? 'Notice' : 'Alert'}
            </span>
            <div className="text-sm font-medium">{t.message}</div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <main className="min-h-screen flex flex-col relative z-10 w-full">
        {/* Nav Header */}
        <header className="w-full px-8 md:px-12 py-4 flex items-center justify-between border-b border-[var(--color-obsidian-ink)]">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-[var(--color-voltage)] border border-[var(--color-obsidian-ink)]"></div>
            <span className="font-sans text-[13px] uppercase tracking-widest font-bold">NewForm</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="ghost-link uppercase tracking-widest text-[11px]"
            >
              Menu
            </button>
          </div>
        </header>

        {/* Menu overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-[var(--color-linen)] z-50 flex flex-col items-center justify-center">
            <button className="absolute top-8 right-12 ghost-link uppercase tracking-widest text-[13px] font-bold" onClick={() => setSidebarOpen(false)}>CLOSE</button>
            <div className="flex flex-col items-center gap-4">
              <a className="font-editorial text-[64px] md:text-[96px] leading-[0.85] text-[var(--color-obsidian-ink)] hover:text-[var(--color-voltage)] hover:italic cursor-pointer transition-all" onClick={() => { setActiveTab('dashboard'); setIsFocusMode(false); setSidebarOpen(false); }}>Dashboard</a>
              <a className="font-editorial text-[64px] md:text-[96px] leading-[0.85] text-[var(--color-obsidian-ink)] hover:text-[var(--color-voltage)] hover:italic cursor-pointer transition-all" onClick={() => { setActiveTab('tasks'); setIsFocusMode(false); setSidebarOpen(false); }}>Tasks</a>
              <a className="font-editorial text-[64px] md:text-[96px] leading-[0.85] text-[var(--color-obsidian-ink)] hover:text-[var(--color-voltage)] hover:italic cursor-pointer transition-all" onClick={() => { setIsFocusMode(true); setActiveTab(''); setSidebarOpen(false); }}>Focus Shield</a>
            </div>
            {session ? (
              <button className="ghost-link uppercase tracking-widest text-[13px] mt-12 font-bold" onClick={() => { setSession(null); setGuestMode(false); setSidebarOpen(false); }}>LOGOUT</button>
            ) : (
              <button className="ghost-link uppercase tracking-widest text-[13px] mt-12 font-bold" onClick={() => setGuestMode(false)}>SIGN IN</button>
            )}
          </div>
        )}

        {/* Views Canvas */}
        <div className="px-8 md:px-12 pb-16 pt-8 flex-grow overflow-y-auto">
          <div className="w-full max-w-[var(--page-max-width)] mx-auto flex flex-col gap-12">
            {isFocusMode ? (
              /* Focus Mode - Full Page Immersive Experience */
              <div className="flex flex-col gap-12 border-t border-[var(--color-obsidian-ink)] pt-8">
                {/* Page Header */}
                <div className="flex items-center justify-between border-b border-[var(--color-obsidian-ink)] pb-4">
                  <div>
                    <h1 className="font-editorial text-display-sm text-[var(--color-obsidian-ink)] leading-none flex items-center gap-4">
                      <span className={`material-symbols-outlined text-[32px] ${isFocusTimerRunning ? 'text-[var(--color-voltage)] animate-pulse-subtle' : 'text-[var(--color-obsidian-ink)]'}`}>timer</span>
                      Focus Shield
                    </h1>
                    <p className="font-sans text-[13px] text-[var(--color-sage)] mt-2">Distraction-free deep work environment</p>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 border border-[var(--color-obsidian-ink)] text-[11px] uppercase tracking-widest font-bold ${
                    isFocusTimerRunning
                      ? 'bg-[var(--color-pollen)] text-[var(--color-obsidian-ink)]'
                      : 'bg-[var(--color-linen)] text-[var(--color-sage)]'
                  }`}>
                    <span className={`w-2 h-2 rounded-none border border-[var(--color-obsidian-ink)] ${isFocusTimerRunning ? 'bg-[var(--color-voltage)] animate-pulse' : 'bg-transparent'}`}></span>
                    {isFocusTimerRunning ? 'Shield Active' : 'Shield Inactive'}
                  </div>
                </div>

                {/* Main Layout: Timer + Stats */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Left Column: Stats cards */}
                  <div className="col-span-1 md:col-span-4 flex flex-col gap-8">
                    {/* Session Stats */}
                    <div className="border border-[var(--color-obsidian-ink)] bg-[var(--color-linen)] p-8 flex flex-col gap-6">
                      <h3 className="font-sans text-[11px] uppercase tracking-widest font-bold text-[var(--color-sage)]">Session Stats</h3>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[13px] text-[var(--color-obsidian-ink)] flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">schedule</span> Duration
                          </span>
                          <span className="font-mono text-[13px] font-bold text-[var(--color-obsidian-ink)]">25 min</span>
                        </div>
                        <div className="w-full h-px bg-[var(--color-mist)]"></div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[13px] text-[var(--color-obsidian-ink)] flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">check_circle</span> Technique
                          </span>
                          <span className="font-mono text-[13px] font-bold text-[var(--color-obsidian-ink)]">Pomodoro</span>
                        </div>
                        <div className="w-full h-px bg-[var(--color-mist)]"></div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[13px] text-[var(--color-obsidian-ink)] flex items-center gap-2">
                            <span className={`material-symbols-outlined text-[18px] ${isAudioPlaying ? 'text-[var(--color-voltage)]' : ''}`}>music_note</span> Ambient
                          </span>
                          <span className={`font-mono text-[13px] font-bold ${isAudioPlaying ? 'text-[var(--color-voltage)]' : 'text-[var(--color-sage)]'}`}>
                            {isAudioPlaying ? '200Hz Active' : 'Muted'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Top Priority Task */}
                    <div className="border border-[var(--color-obsidian-ink)] bg-[var(--color-linen)] p-8 flex flex-col gap-6">
                      <h3 className="font-sans text-[11px] uppercase tracking-widest font-bold text-[var(--color-sage)]">Focus Target</h3>
                      {tasks.filter(t => !t.completed).length > 0 ? (
                        <div className="flex flex-col gap-4">
                          <div className="font-editorial text-[20px] font-bold text-[var(--color-obsidian-ink)] leading-tight">
                            {tasks.filter(t => !t.completed).sort((a,b) => {
                              const hoursA = Math.max(0.1, (new Date(a.deadline) - new Date()) / 3600000);
                              const hoursB = Math.max(0.1, (new Date(b.deadline) - new Date()) / 3600000);
                              return (100*Math.exp(-hoursA/16) + a.importance*8) < (100*Math.exp(-hoursB/16) + b.importance*8) ? 1 : -1;
                            })[0].title}
                          </div>
                          <div className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-sage)]">
                            Due: {new Date(tasks.filter(t => !t.completed)[0].deadline).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex-1 h-2 border border-[var(--color-obsidian-ink)] bg-[var(--color-linen)] overflow-hidden">
                              <div className="h-full bg-[var(--color-voltage)]" style={{ width: `${Math.min(100, (1500 - focusTimeLeft) / 15)}%` }}></div>
                            </div>
                            <span className="font-mono text-[11px] text-[var(--color-obsidian-ink)] font-bold">{Math.round((1500 - focusTimeLeft) / 15)}%</span>
                          </div>
                        </div>
                      ) : (
                        <p className="font-mono text-[13px] text-[var(--color-sage)] italic">All tasks complete. 🎉</p>
                      )}
                    </div>

                    {/* Ambient Audio Control */}
                    <div className="border border-[var(--color-obsidian-ink)] bg-[var(--color-linen)] p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 flex items-center justify-center border border-[var(--color-obsidian-ink)] ${
                          isAudioPlaying ? 'bg-[var(--color-voltage)] text-[var(--color-obsidian-ink)]' : 'bg-transparent text-[var(--color-sage)]'
                        }`}>
                          <span className="material-symbols-outlined text-[20px]">{isAudioPlaying ? 'volume_up' : 'volume_off'}</span>
                        </div>
                        <div>
                          <div className="font-sans text-[13px] font-bold text-[var(--color-obsidian-ink)] uppercase tracking-widest">Theta Waves</div>
                          <div className="font-mono text-[11px] text-[var(--color-sage)] mt-1">200Hz focus synth</div>
                        </div>
                      </div>
                      <button
                        className="ghost-link text-[11px] uppercase tracking-widest font-bold"
                        onClick={() => isAudioPlaying ? stopAmbientSynth() : startAmbientSynth()}
                      >
                        {isAudioPlaying ? 'Stop' : 'Play'}
                      </button>
                    </div>
                  </div>

                  {/* Right: Large Timer Panel */}
                  <div className="col-span-1 md:col-span-8">
                    <div className="border border-[var(--color-obsidian-ink)] bg-[var(--color-linen)] p-12 flex flex-col items-center justify-center gap-12 min-h-[480px]">
                      {/* Radial progress + timer */}
                      <div className="relative">
                        <svg width="280" height="280" className="progress-ring" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="140" cy="140" r="120" fill="transparent" stroke="var(--color-mist)" strokeWidth="2"/>
                          <circle
                            cx="140" cy="140" r="120" fill="transparent"
                            stroke="var(--color-voltage)" strokeWidth="6" strokeLinecap="square"
                            strokeDasharray={2 * Math.PI * 120}
                            strokeDashoffset={2 * Math.PI * 120 * (focusTimeLeft / 1500)}
                            style={{ transition: 'stroke-dashoffset 1s linear' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <span className={`material-symbols-outlined text-[40px] ${isFocusTimerRunning ? 'text-[var(--color-voltage)] animate-pulse-subtle' : 'text-[var(--color-obsidian-ink)]'}`}>timer</span>
                          <div className="text-[64px] font-editorial font-bold tracking-tight text-[var(--color-obsidian-ink)] select-none">
                            {formatFocusTimer(focusTimeLeft)}
                          </div>
                          <div className="text-[11px] text-[var(--color-sage)] font-bold uppercase tracking-widest">
                            {isFocusTimerRunning ? 'In Session' : 'Paused'}
                          </div>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex gap-6 w-full max-w-md">
                        <button
                          className="flex-1 py-4 px-6 bg-[var(--color-voltage)] text-[var(--color-obsidian-ink)] font-bold border border-[var(--color-obsidian-ink)] hover:bg-[var(--color-obsidian-ink)] hover:text-[var(--color-linen)] transition-colors flex items-center justify-center gap-3 cursor-pointer text-[13px] uppercase tracking-widest"
                          onClick={toggleFocusTimer}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {isFocusTimerRunning ? 'pause' : 'play_arrow'}
                          </span>
                          {isFocusTimerRunning ? 'Pause' : 'Start'}
                        </button>
                        <button
                          className="flex-1 py-4 px-6 bg-[var(--color-linen)] text-[var(--color-obsidian-ink)] font-bold border border-[var(--color-obsidian-ink)] hover:bg-[var(--color-mist)] transition-colors flex items-center justify-center gap-3 cursor-pointer text-[13px] uppercase tracking-widest"
                          onClick={() => {
                            setIsFocusTimerRunning(false);
                            setFocusTimeLeft(1500);
                          }}
                        >
                          <span className="material-symbols-outlined text-[20px]">restart_alt</span>
                          Reset
                        </button>
                        <button
                          className="py-4 px-6 bg-[var(--color-linen)] text-[var(--color-sage)] font-bold border border-[var(--color-obsidian-ink)] hover:text-[var(--color-obsidian-ink)] hover:bg-[var(--color-mist)] transition-colors flex items-center justify-center cursor-pointer text-[13px] uppercase tracking-widest"
                          title="Close Shield"
                          onClick={() => {
                            setIsFocusTimerRunning(false);
                            stopAmbientSynth();
                            setIsFocusMode(false);
                            setActiveTab('dashboard');
                          }}
                        >
                          <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                      </div>

                      {/* Motivation text */}
                      <div className="text-center mt-6" style={{ minWidth: '320px', width: '100%', maxWidth: '480px' }}>
                        <p className="font-editorial text-[20px] text-[var(--color-obsidian-ink)] italic leading-relaxed">
                          {isFocusTimerRunning
                            ? '"Deep work is the ability to focus without distraction on a cognitively demanding task."'
                            : 'Ready to enter your flow state. Start the timer to begin your session.'}
                        </p>
                        {isFocusTimerRunning && (
                          <p className="font-sans text-[11px] uppercase tracking-widest font-bold text-[var(--color-sage)] mt-4">— Cal Newport</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
              {activeTab === 'dashboard' && (
                <div className="space-y-12">
                  {/* Hero Statement */}
                  <div className="w-full flex flex-col md:flex-row gap-8 items-end pt-2 pb-8 border-b border-[var(--color-obsidian-ink)] mb-8">
                    <div className="w-full md:w-3/4">
                      <h1 className="font-editorial text-[64px] md:text-[96px] leading-[0.9] text-[var(--color-obsidian-ink)] tracking-tight -ml-1">
                        Financial<br/>
                        <span className="inline-flex items-end gap-6">
                          Command
                        </span>
                      </h1>
                      <p className="font-sans text-[14px] text-[var(--color-sage)] max-w-md mt-6 leading-relaxed">
                        A real-time editorial view of your operational readiness. Active targets and systemic risks are rendered as they unfold.
                      </p>
                    </div>
                    
                    <div className="w-full md:w-1/4 flex flex-col gap-6 text-right">
                      <div className="flex flex-col border-b border-[var(--color-mist)] pb-4">
                        <span className="font-sans text-[11px] font-bold uppercase tracking-widest text-[var(--color-sage)] mb-1">Clarity</span>
                        <span className="font-editorial text-[48px] md:text-[64px] font-bold text-[var(--color-obsidian-ink)] leading-none">{clarityScore}%</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-sans text-[11px] font-bold uppercase tracking-widest text-[var(--color-sage)] mb-1">Threats</span>
                        <span className="font-editorial text-[48px] md:text-[64px] font-bold text-[var(--color-obsidian-ink)] leading-none">{urgentCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3D Timeline Centerpiece */}
                  <MissionControl3D 
                    tasks={filteredTasks} 
                    nextBestActionId={nextBestActionId} 
                    onSelectTask={(task) => setSelectedTaskDetail(task)} 
                  />

                  {/* Next Best Action Card */}
                  <NextActionCard 
                    tasks={tasks} 
                    userEnergy={userEnergy} 
                    onStartFocus={() => {
                      setIsFocusMode(true);
                      setIsFocusTimerRunning(true);
                      startAmbientSynth();
                    }}
                    onStartAutopilot={startAutopilotAgent}
                  />

                  {/* Dashboard Content Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Left Column: Tasks prioritizer and autopilot terminal */}
                    <div className="col-span-1 md:col-span-7 flex flex-col gap-8">
                      <TaskPrioritizer 
                        tasks={tasks} 
                        setTasks={setTasks} 
                        userEnergy={userEnergy} 
                        setUserEnergy={setUserEnergy} 
                        onDelegate={startAutopilotAgent}
                        onSelectTask={(task) => setSelectedTaskDetail(task)}
                        showAddModal={showAddModal}
                        setShowAddModal={setShowAddModal}
                        onSyncTaskToCalendar={syncTaskToCalendar}
                        onSyncAllToCalendar={syncAllToCalendar}
                        gcalConnected={gcalConnected}
                        gcalSyncing={gcalSyncing}
                      />
                      
                      <AgentWorkspace 
                        activeTask={activeAgentTask} 
                        onAgentFinish={handleAgentFinish} 
                        addToast={addToast} 
                      />
                    </div>

                    {/* Right Column: Goal tracker and simulator card */}
                    <div className="col-span-1 md:col-span-5 flex flex-col gap-8">
                      <GoalTracker 
                        habits={habits} 
                        setHabits={setHabits} 
                        tasks={tasks}
                        addToast={addToast} 
                      />

                      {/* Location context detail card */}
                      <div className="border border-[var(--color-obsidian-ink)] bg-[var(--color-linen)] p-8 flex flex-col gap-4">
                        <h3 className="font-sans text-[11px] font-bold uppercase tracking-widest text-[var(--color-sage)]">
                          Physical Geo-Context
                        </h3>
                        <div className="flex items-start gap-4 mt-2">
                          <span className="text-3xl grayscale">
                            {userContext === 'office' ? '🏢' : userContext === 'home' ? '🏠' : '🚇'}
                          </span>
                          <div className="flex flex-col gap-1">
                            <div className="font-editorial text-[20px] font-bold text-[var(--color-obsidian-ink)] leading-tight">
                              {userContext === 'office' ? 'Corporate Head Office' : userContext === 'home' ? 'Residential Base' : 'Transit Corridor'}
                            </div>
                            <p className="font-mono text-[13px] text-[var(--color-sage)] leading-relaxed">
                              Adaptive deadline scoring & scheduling protocols are calibrated for this workspace.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tasks' && (
                <div className="w-full">
                  <TaskPrioritizer 
                    tasks={tasks} 
                    setTasks={setTasks} 
                    userEnergy={userEnergy} 
                    setUserEnergy={setUserEnergy} 
                    onDelegate={startAutopilotAgent}
                    onSelectTask={(task) => setSelectedTaskDetail(task)}
                    showAddModal={showAddModal}
                    setShowAddModal={setShowAddModal}
                  />
                </div>
              )}

              {activeTab === 'calendar' && (
                <CalendarView 
                  tasks={tasks} 
                  setTasks={setTasks} 
                  addToast={addToast} 
                />
              )}

              {activeTab === 'autopilot' && (
                <div className="max-w-3xl mx-auto">
                  <AgentWorkspace 
                    activeTask={activeAgentTask} 
                    onAgentFinish={handleAgentFinish} 
                    addToast={addToast} 
                  />
                </div>
              )}

              {activeTab === 'voice' && (
                <VoiceAssistant 
                  tasks={tasks} 
                  setTasks={setTasks} 
                  addToast={addToast} 
                  runAutoSchedule={() => addToast('Focus blocks auto-scheduler re-slotted.', 'agent')}
                  startFocusMode={() => {
                    setIsFocusMode(true);
                    setIsFocusTimerRunning(true);
                    startAmbientSynth();
                  }}
                  userEnergy={userEnergy}
                  apiKey={apiKey}
                />
              )}
              {activeTab === 'settings' && (
                <SettingsView />
              )}

              {activeTab === 'help' && (
                <HelpView />
              )}
               </>
            )}
          </div>
        </div>
      </main>

      {/* Task Details Side Drawer / Modal (triggered on 3D node selection) */}
      {selectedTaskDetail && (
        <div
          className="fixed inset-0 z-50 bg-[var(--color-linen)] bg-opacity-95 flex items-center justify-center p-4"
          onClick={() => setSelectedTaskDetail(null)}
        >
          <div
            className="w-full max-w-lg bg-[var(--color-linen)] border border-[var(--color-obsidian-ink)] p-12 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-end pb-4 border-b border-[var(--color-mist)] mb-8">
              <h3 className="font-editorial text-display text-[var(--color-obsidian-ink)] leading-none">Target Detail</h3>
              <button
                className="ghost-link text-[11px] uppercase tracking-widest text-[var(--color-sage)]"
                onClick={() => setSelectedTaskDetail(null)}
              >
                Close
              </button>
            </div>

            {/* Task Title */}
            <div className="mb-8">
              <div className="text-[24px] font-sans font-[550] text-[var(--color-obsidian-ink)] leading-snug">{selectedTaskDetail.title}</div>
            </div>

            {/* Metadata rows */}
            <div className="border-t border-b border-[var(--color-mist)] py-6 flex flex-col gap-6 mb-8">
              {/* Deadline */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-widest text-[var(--color-sage)] font-bold">Deadline</span>
                <span className="text-[16px] text-[var(--color-obsidian-ink)] font-medium">
                  {new Date(selectedTaskDetail.deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-widest text-[var(--color-sage)] font-bold">Status</span>
                  <span className={`text-[16px] font-medium ${selectedTaskDetail.completed ? 'text-[var(--color-sage)] line-through' : 'text-[var(--color-voltage)]'}`}>
                    {selectedTaskDetail.completed ? 'Completed' : 'Pending'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-widest text-[var(--color-sage)] font-bold">Estimated Focus Time</span>
                  <span className="text-[16px] text-[var(--color-obsidian-ink)] font-medium">{selectedTaskDetail.estHours}h</span>
                </div>
              </div>

              {/* Importance + Complexity in a row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-widest text-[var(--color-sage)] font-bold">Importance</span>
                  <span className="text-[16px] text-[var(--color-obsidian-ink)] font-medium">{selectedTaskDetail.importance} / 5</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-widest text-[var(--color-sage)] font-bold">Complexity</span>
                  <span className="text-[16px] text-[var(--color-obsidian-ink)] font-medium">{selectedTaskDetail.difficulty} / 5</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-4">
              <span className="text-[10px] uppercase tracking-widest text-[var(--color-sage)] font-bold mb-2">Autopilot Protocols</span>
              <div className="flex gap-4">
                {!selectedTaskDetail.completed && (
                  <button
                    className="voltage-btn flex-1 text-[12px] py-[16px]"
                    onClick={() => {
                      startAutopilotAgent(selectedTaskDetail);
                      setSelectedTaskDetail(null);
                    }}
                  >
                    Autopilot Run
                  </button>
                )}
                <button
                  className="ghost-link border border-[var(--color-obsidian-ink)] flex-1 text-[12px] py-[16px] uppercase tracking-widest font-bold"
                  onClick={() => {
                    setTasks(prev => prev.map(t => t.id === selectedTaskDetail.id ? { ...t, completed: !t.completed } : t));
                    setSelectedTaskDetail(prev => ({ ...prev, completed: !prev.completed }));
                  }}
                >
                  {selectedTaskDetail.completed ? 'Set Pending' : 'Mark Complete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
