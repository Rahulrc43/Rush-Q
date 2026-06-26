import React, { useState, useEffect, useRef } from 'react';

const callGemini = async (prompt) => {
  try {
    const res = await fetch('/api/ai/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.response;
  } catch (e) {
    console.error("AI Assistant failed", e);
    return null;
  }
};

export default function VoiceAssistant({ tasks, setTasks, addToast, runAutoSchedule, startFocusMode, userEnergy }) {
  const [isListening, setIsListening] = useState(false);
  const [userSpeech, setUserSpeech] = useState('');
  const [aiResponse, setAiResponse] = useState("System online. Click the microphone to begin voice protocols.");
  const [conversation, setConversation] = useState([
    { role: 'ai', text: 'System online. Click the microphone core to begin voice protocols.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef(null);
  const conversationEndRef = useRef(null);

  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

  useEffect(() => {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setUserSpeech('Listening...');
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserSpeech(transcript);
        processVoiceCommand(transcript);
      };

      rec.onerror = (e) => {
        console.error(e);
        setIsListening(false);
        addConversationEntry('ai', 'Voice recognition sensor timeout. Please try again.');
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [tasks]);

  const addConversationEntry = (role, text) => {
    setConversation(prev => [...prev, {
      role,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const getTopTask = () => {
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
      const score = Math.min(100, Math.round(deadlineWeight + importanceWeight + difficultyWeight + timeWeight));
      return { ...t, score, hoursLeft };
    });

    scored.sort((a,b) => b.score - a.score);
    return scored[0];
  };

  const processVoiceCommand = async (commandText) => {
    const text = commandText.toLowerCase().trim();
    setIsProcessing(true);
    addConversationEntry('user', commandText);

    addConversationEntry('ai', 'Querying Google AI Studio NLU parser...');
    const prompt = `You are the NLU parser for DeadlineOS, an intelligent companion. Given this voice input: "${commandText}". Classify it into one of these actions:
1) ADD_TASK: [description] (optionally followed by date clues, e.g. tomorrow, tonight)
2) FOCUS
3) STATUS
4) SCHEDULER
5) CONVERSATIONAL: [response] (if the input is a general question or greeting, write a concise conversational productivity advice response under 25 words)

Return ONLY the formatted classification, e.g. "ADD_TASK: buy groceries tomorrow" or "STATUS" or "CONVERSATIONAL: Hello, let me check your tasks."`;
      
    const geminiResult = await callGemini(prompt);
    if (geminiResult) {
      const cleanedResult = geminiResult.trim();
        
      if (cleanedResult.startsWith('ADD_TASK:')) {
        const rawTitle = cleanedResult.replace(/^ADD_TASK:\s*/i, '');
        let deadline = new Date();
        let deadlineStr = 'tomorrow';

        if (rawTitle.includes('tomorrow')) {
            deadline.setDate(deadline.getDate() + 1);
            deadline.setHours(17, 0, 0, 0);
          } else if (rawTitle.includes('tonight')) {
            deadline.setHours(23, 59, 0, 0);
            deadlineStr = 'tonight';
          } else {
            deadline.setDate(deadline.getDate() + 1);
          }

          const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).replace(/\bby\b\s*$/, '').trim();
          const newTask = {
            id: Date.now().toString(),
            title: title || 'Voice Assigned Task',
            deadline: deadline.toISOString(),
            importance: 3,
            difficulty: 3,
            estHours: 1,
            completed: false,
            scheduledTime: null,
            subtasks: []
          };
          setTasks([...tasks, newTask]);
          const feedback = `Recorded: "${newTask.title}" via Gemini parser, set for ${deadlineStr}.`;
          setConversation(prev => [...prev.slice(0, -1), { role: 'ai', text: feedback, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
          speakText(feedback);
          addToast(`Recorded: "${newTask.title}" via Voice`, 'safe');
          setIsProcessing(false);
          return;
        } else if (cleanedResult.startsWith('FOCUS')) {
          startFocusMode();
          const feedback = "Focus shield countdown engaged.";
          setConversation(prev => [...prev.slice(0, -1), { role: 'ai', text: feedback, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
          speakText(feedback);
          setIsProcessing(false);
          return;
        } else if (cleanedResult.startsWith('STATUS')) {
          const top = getTopTask();
          if (!top) {
            const feedback = "All targets cleared.";
            setConversation(prev => [...prev.slice(0, -1), { role: 'ai', text: feedback, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
            speakText(feedback);
            setIsProcessing(false);
            return;
          }
          const feedback = `Your top target is: "${top.title}". It is due in ${Math.round(top.hoursLeft)} hours with a priority score of ${top.score}.`;
          setConversation(prev => [...prev.slice(0, -1), { role: 'ai', text: feedback, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
          speakText(feedback);
          setIsProcessing(false);
          return;
        } else if (cleanedResult.startsWith('SCHEDULER')) {
          runAutoSchedule();
          const feedback = "Agenda mapping optimized in focus scheduler.";
          setConversation(prev => [...prev.slice(0, -1), { role: 'ai', text: feedback, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
          speakText(feedback);
          setIsProcessing(false);
          return;
        } else if (cleanedResult.startsWith('CONVERSATIONAL:')) {
          const feedback = cleanedResult.replace(/^CONVERSATIONAL:\s*/i, '');
          setConversation(prev => [...prev.slice(0, -1), { role: 'ai', text: feedback, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
          speakText(feedback);
          setIsProcessing(false);
          return;
        }
      }


    // Fallback local NLU
    let feedback = '';
    if (text.includes('what should') && (text.includes('do') || text.includes('now')) || text.includes('next')) {
      const top = getTopTask();
      if (!top) {
        feedback = "All targets cleared. You have no pending deadlines.";
      } else {
        feedback = `Your next best action is to work on: "${top.title}". It is due in ${Math.round(top.hoursLeft)} hours with a priority score of ${top.score}.`;
      }
    } else if (text.startsWith('add task') || text.startsWith('create task') || text.startsWith('new task')) {
      let rawTitle = text.replace(/^(add|create|new) task\s*/i, '');
      let deadline = new Date();
      let deadlineStr = 'tomorrow';
      if (rawTitle.includes('tomorrow')) {
        deadline.setDate(deadline.getDate() + 1);
        deadline.setHours(17, 0, 0, 0);
        rawTitle = rawTitle.replace(/\bby\s+tomorrow\b|\btomorrow\b/gi, '');
      } else if (rawTitle.includes('tonight')) {
        deadline.setHours(23, 59, 0, 0);
        deadlineStr = 'tonight';
        rawTitle = rawTitle.replace(/\bby\s+tonight\b|\btonight\b/gi, '');
      } else {
        deadline.setDate(deadline.getDate() + 1);
      }
      const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).replace(/\bby\b\s*$/, '').trim();
      const newTask = {
        id: Date.now().toString(),
        title: title || 'Voice Assigned Task',
        deadline: deadline.toISOString(),
        importance: 3, difficulty: 3, estHours: 1,
        completed: false, scheduledTime: null, subtasks: []
      };
      setTasks([...tasks, newTask]);
      feedback = `Task recorded: "${newTask.title}", set for ${deadlineStr}.`;
      addToast(`Recorded: "${newTask.title}" via Voice`, 'safe');
    } else if (text.includes('focus') || text.includes('shield')) {
      startFocusMode();
      feedback = "Initializing Pomodoro focus shield countdown. White noise hum active.";
    } else {
      feedback = `Voice query parsed: '${commandText}'. Try: 'what should I do now?' or 'add task pay utilities tomorrow'.`;
    }

    addConversationEntry('ai', feedback);
    speakText(feedback);
    setIsProcessing(false);
  };

  const playBriefing = (type) => {
    const activeTasks = tasks.filter(t => !t.completed);
    const completedToday = tasks.filter(t => t.completed).length;

    if (type === 'morning') {
      const top = getTopTask();
      let briefingText = `Good morning. You have ${activeTasks.length} pending targets on your radar. `;
      if (top) {
        briefingText += `Your highest priority target is: "${top.title}", which has a deadline in ${Math.round(top.hoursLeft)} hours.`;
      } else {
        briefingText += `Your agenda is completely clear. Have a relaxed day.`;
      }
      addConversationEntry('ai', `[Morning Briefing] ${briefingText}`);
      speakText(briefingText);
    } else {
      const total = tasks.length;
      const clarity = total > 0 ? Math.round((completedToday / total) * 100) : 100;
      const briefingText = `Good evening. You completed ${completedToday} tasks today. Your agenda Clarity Score is ${clarity} percent.`;
      addConversationEntry('ai', `[Evening Wrap-Up] ${briefingText}`);
      speakText(briefingText);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      addToast("Speech recognition not supported in this browser context.", "emergency");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const quickCommands = [
    { label: 'What should I do?', icon: 'psychology', action: () => processVoiceCommand('What should I do now?') },
    { label: 'Start Focus', icon: 'timer', action: () => processVoiceCommand('Start focus mode') },
    { label: 'Morning Briefing', icon: 'auto_stories', action: () => playBriefing('morning') },
    { label: 'Evening Wrap-Up', icon: 'coffee', action: () => playBriefing('evening') },
    { label: 'Run Scheduler', icon: 'auto_schedule', action: () => { runAutoSchedule(); addConversationEntry('ai', 'Agenda mapping optimized.'); } },
  ];

  return (
    <div className="flex flex-col gap-12 border-t border-[var(--color-obsidian-ink)] pt-8">
      {/* Page Header */}
      <div className="flex items-end justify-between border-b border-[var(--color-obsidian-ink)] pb-4">
        <div>
          <h1 className="font-editorial text-display text-[var(--color-obsidian-ink)] leading-none flex items-center gap-4">
            <span className={`material-symbols-outlined text-[48px] ${isListening ? 'text-[var(--color-voltage)] animate-pulse-subtle' : 'text-[var(--color-obsidian-ink)]'}`}>mic</span>
            Voice Assistant
          </h1>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 border text-[13px] font-bold uppercase tracking-widest ${
          isListening
            ? 'bg-[var(--color-voltage)] border-[var(--color-voltage)] text-[var(--color-obsidian-ink)]'
            : apiKey
            ? 'bg-[var(--color-linen)] border-[var(--color-mist)] text-[var(--color-obsidian-ink)]'
            : 'bg-[var(--color-linen)] border-[var(--color-mist)] text-[var(--color-sage)]'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-[var(--color-obsidian-ink)] animate-pulse' : apiKey ? 'bg-[var(--color-voltage)]' : 'bg-[var(--color-mist)]'}`}></span>
          {isListening ? 'Listening...' : apiKey ? 'Gemini Engine Active' : 'Local NLU Mode'}
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-12 gap-12">
        {/* Left: Mic + Quick Commands */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">

          {/* Mic Button Card */}
          <div className="border border-[var(--color-obsidian-ink)] p-8 flex flex-col items-center gap-6 bg-[var(--color-linen)]">
            <div className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-sage)] self-start">Voice Input</div>

            {/* Large Mic Button */}
            <div
              className={`relative w-32 h-32 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 select-none ${
                isListening
                  ? 'bg-[var(--color-voltage)]'
                  : 'bg-[var(--color-linen)] hover:bg-[var(--color-pollen)] border-2 border-[var(--color-obsidian-ink)]'
              }`}
              onClick={toggleListening}
            >
              {isListening && (
                <div className="absolute inset-0 rounded-full border border-[var(--color-obsidian-ink)] animate-ping"></div>
              )}
              <span className={`material-symbols-outlined text-[48px] ${isListening ? 'text-[var(--color-obsidian-ink)]' : 'text-[var(--color-obsidian-ink)]'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                {isListening ? 'hearing' : 'mic'}
              </span>
            </div>

            <div className="text-center font-mono">
              <p className="text-[14px] font-bold text-[var(--color-obsidian-ink)] uppercase tracking-widest">
                {isListening ? 'Listening...' : isProcessing ? 'Processing...' : 'Tap to speak'}
              </p>
              {userSpeech && userSpeech !== 'Listening...' && (
                <p className="text-[13px] text-[var(--color-obsidian-ink)] mt-2 italic bg-[var(--color-pollen)] bg-opacity-20 p-2 border-l-2 border-[var(--color-obsidian-ink)]">"{userSpeech}"</p>
              )}
            </div>
          </div>

          {/* Quick Commands */}
          <div className="border-t border-[var(--color-obsidian-ink)] pt-6 flex flex-col gap-4">
            <div className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-sage)]">Quick Commands</div>
            <div className="flex flex-col gap-3">
              {quickCommands.map((cmd, i) => (
                <button
                  key={i}
                  className="ghost-link py-3 px-4 flex items-center gap-4 text-left border border-[var(--color-mist)] hover:border-[var(--color-obsidian-ink)] transition-colors"
                  onClick={cmd.action}
                >
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-obsidian-ink)]">{cmd.icon}</span>
                  <span className="text-[14px] font-bold text-[var(--color-obsidian-ink)]">{cmd.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Conversation Panel */}
        <div className="col-span-12 lg:col-span-8">
          <div className="border border-[var(--color-obsidian-ink)] bg-[var(--color-linen)] flex flex-col" style={{ minHeight: '600px' }}>
            {/* Panel header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--color-obsidian-ink)]">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[24px] text-[var(--color-obsidian-ink)]">forum</span>
                <span className="text-[16px] font-editorial font-bold text-[var(--color-obsidian-ink)] uppercase tracking-widest">AI Conversation Log</span>
              </div>
              <button
                className="ghost-link text-[11px] uppercase tracking-widest font-bold flex items-center gap-2"
                onClick={() => setConversation([{ role: 'ai', text: 'System online. Click the microphone to begin voice protocols.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])}
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Clear
              </button>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col gap-6" style={{ maxHeight: '480px' }}>
              {conversation.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center text-[16px] border ${
                    msg.role === 'user'
                      ? 'bg-[var(--color-linen)] border-[var(--color-obsidian-ink)] text-[var(--color-obsidian-ink)]'
                      : 'bg-[var(--color-obsidian-ink)] border-[var(--color-obsidian-ink)] text-[var(--color-linen)]'
                  }`}>
                    {msg.role === 'user'
                      ? <span className="material-symbols-outlined">person</span>
                      : <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                    }
                  </div>
                  {/* Bubble */}
                  <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-6 py-4 text-[15px] leading-relaxed border ${
                      msg.role === 'user'
                        ? 'bg-[var(--color-linen)] text-[var(--color-obsidian-ink)] border-[var(--color-obsidian-ink)]'
                        : 'bg-[var(--color-obsidian-ink)] text-[var(--color-linen)] border-[var(--color-obsidian-ink)]'
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-sage)]">{msg.time}</span>
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex gap-4">
                  <div className="w-10 h-10 border border-[var(--color-obsidian-ink)] bg-[var(--color-obsidian-ink)] flex-shrink-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[var(--color-linen)]" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                  </div>
                  <div className="px-6 py-4 border border-[var(--color-obsidian-ink)] bg-[var(--color-obsidian-ink)] text-[var(--color-linen)] text-[15px] flex items-center gap-2">
                    <span className="w-2 h-2 bg-[var(--color-voltage)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-[var(--color-voltage)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-[var(--color-voltage)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={conversationEndRef}></div>
            </div>

            {/* Footer status bar */}
            <div className="px-8 py-4 border-t border-[var(--color-mist)] flex items-center justify-between">
              <div className="flex items-center gap-3 text-[12px] font-bold uppercase tracking-widest text-[var(--color-obsidian-ink)]">
                <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-[var(--color-voltage)] animate-pulse' : 'bg-[var(--color-mist)]'}`}></span>
                {isListening ? 'Microphone active — speak now' : 'Microphone inactive'}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage)]">
                {apiKey ? 'Powered by Gemini' : 'Local NLU mode'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
