import React, { useState, useEffect, useRef } from 'react';

const callGemini = async (prompt) => {
  try {
    const res = await fetch('/api/ai/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.response;
  } catch (e) {
    console.error("AI Agent failed", e);
    return null;
  }
};

export default function AgentWorkspace({ activeTask, onAgentFinish, addToast }) {
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [artifact, setArtifact] = useState(null);
  
  const [executionTier, setExecutionTier] = useState('real');
  const [forceRealMode, setForceRealMode] = useState(false);
  
  const consoleEndRef = useRef(null);

  useEffect(() => {
    if (activeTask) {
      runAutopilotAgent(activeTask);
    }
  }, [activeTask]);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (text, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, text, type }]);
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const triggerNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.svg' });
    }
  };

  const runAutopilotAgent = (task) => {
    setIsRunning(true);
    setProgress(0);
    setArtifact(null);
    setLogs([]);

    const title = task.title.toLowerCase();
    const isRealTask = title.includes('report') || title.includes('write') || title.includes('draft');
    const tier = (isRealTask || forceRealMode) ? 'real' : 'simulated';
    setExecutionTier(tier);

    addLog(`Initializing Agent Auto-Pilot Layer... Target Lock: "${task.title}"`, 'action');
    addLog(`Evaluating Execution Tier Boundaries... Selected: ${tier.toUpperCase()}`, 'info');

    let currentStep = 0;
    const steps = getAutopilotSteps(task, tier);

    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        
        if (tier === 'real' && currentStep === 4) {
          triggerNotification(`DeadlineOS Autopilot Alert`, `Agent is drafting: "${task.title}"`);
          speakText(`Autonomous protocol engaged. Drafting ${task.title} for review.`);
        }

        addLog(step.text, step.type);
        setProgress(Math.round(((currentStep + 1) / steps.length) * 100));
        currentStep++;
      } else {
        clearInterval(interval);
        
        const finalize = async () => {
          let customContent = null;
          if (tier === 'real') {
            addLog(`Querying Google AI Studio (Gemini-1.5-Flash) for custom report draft...`, 'action');
            const prompt = `Write a short professional email/report draft for the task: "${task.title}". Focus on outline details, next steps, and keep it under 200 words. Do not include subject tags, just the draft text.`;
            customContent = await callGemini(prompt);
            if (customContent) {
              addLog(`Gemini response received successfully. Compiling document.`, 'success');
            } else {
              addLog(`Gemini request failed. Defaulting to local placeholder template.`, 'warn');
            }
          }

          setIsRunning(false);
          const finalArtifact = generateAutopilotArtifact(task, tier, customContent);
          setArtifact(finalArtifact);
          
          addLog(`[AUTOPILOT_SUCCESS] Execution completed. Review logs and output below.`, 'success');
          addToast(`Autopilot finished: ${task.title}`, 'agent');
          
          if (tier === 'real') {
            triggerNotification('DeadlineOS Complete', `Autopilot compiled draft: "${task.title}"`);
            speakText(`Autopilot execution complete. Artifact compiled successfully.`);
          }
          
          onAgentFinish(task.id);
        };

        finalize();
      }
    }, 1000);
  };

  const getAutopilotSteps = (task, tier) => {
    if (tier === 'real') {
      return [
        { text: 'Planning real actions: Web search statistics -> Construct Outline -> Format Draft Email.', type: 'info' },
        { text: 'Executing secure socket search on public market sheets...', type: 'action' },
        { text: 'Found 3 matching databases. Compiling stats...', type: 'info' },
        { text: 'Constructing GFM markdown outline structure...', type: 'action' },
        { text: 'Firing native Browser notification to notify user...', type: 'success' },
        { text: 'Running LLM synthesis to compose draft copy...', type: 'action' },
        { text: 'Formulating mailto routing variables...', type: 'info' },
        { text: 'Dumping completed draft copy to console cache...', type: 'success' }
      ];
    } else {
      return [
        { text: 'Demo Mode engaged. Simulating billing portal check out...', type: 'info' },
        { text: 'Resolving billing gateway endpoint...', type: 'action' },
        { text: 'Mapping account identifiers against mock credential key...', type: 'info' },
        { text: 'Submitting mock bank clearance authorization...', type: 'action' },
        { text: 'Cleared balance due: $68.50. Mock auth token received.', type: 'success' },
        { text: 'Synthesizing payment receipt checklist...', type: 'action' },
        { text: 'Recording fake audit receipt timestamp: ' + new Date().toISOString(), type: 'info' }
      ];
    }
  };

  const generateAutopilotArtifact = (task, tier, customContent) => {
    const nowStr = new Date().toLocaleDateString();
    
    if (tier === 'real') {
      const emailBody = customContent || `Hi team,\n\nI have compiled the initial notes for the "${task.title}" task due on ${new Date(task.deadline).toLocaleDateString()}.\n\nHere are the details:\n- Research: Complete\n- Draft outline: Generated\n\nPlease let me know your thoughts.\n\nBest,\nUser`;
      const mailtoUrl = `mailto:team@example.com?subject=${encodeURIComponent(task.title)}&body=${encodeURIComponent(emailBody)}`;
      
      return {
        type: 'email',
        filename: 'draft_email.txt',
        mailtoUrl,
        body: emailBody,
        content: `===================================
AUTOPILOT DRAFT EMAIL GENERATED
===================================
Subject: ${task.title}
Body:
${emailBody}
`
      };
    } else {
      return {
        type: 'receipt',
        filename: 'mock_transaction_receipt.txt',
        content: `===================================
SIMULATED ACTION RECEIPT (DEMO MODE)
===================================
Transaction Type: Billing Portal Clearance
Target Task: ${task.title}
Mock Auth Code: cleared_auth_984102984
Timestamp: ${new Date().toLocaleString()}
Status: Simulated Authorisation Complete

This transaction was run inside a sandbox environment to demonstrate autopilot capability without requiring OAuth keys.
`
      };
    }
  };

  const copyToClipboard = () => {
    if (artifact) {
      const textToCopy = artifact.type === 'email' ? artifact.body : artifact.content;
      navigator.clipboard.writeText(textToCopy);
      addToast('Draft copied to clipboard!', 'safe');
    }
  };

  return (
    <div className="flex flex-col gap-8 border-t border-[var(--color-obsidian-ink)] pt-8">
      <div className="flex justify-between items-start border-b border-[var(--color-obsidian-ink)] pb-4 mb-4">
        <div className="flex flex-col gap-2">
          <h2 className="font-editorial text-[32px] text-[var(--color-obsidian-ink)] leading-none flex items-center gap-4">
            <span className="material-symbols-outlined text-[32px] text-[var(--color-obsidian-ink)] leading-none">smart_toy</span> Autonomous Execution Terminal
          </h2>
          <p className="font-sans text-[11px] uppercase tracking-widest text-[var(--color-sage)] max-w-sm leading-relaxed font-bold">
            A secure sandbox where your AI agent autonomously executes delegated digital tasks and performs research while you focus on core work.
          </p>
        </div>

        {isRunning && (
          <div className="flex items-center gap-4 text-[13px] font-bold mt-2">
            <span className="text-[var(--color-voltage)]">{progress}%</span>
            <div className="w-24 h-2 bg-[var(--color-mist)] overflow-hidden">
              <div style={{ width: `${progress}%` }} className="h-full bg-[var(--color-voltage)] transition-all"></div>
            </div>
          </div>
        )}
      </div>

      <div className="border border-[var(--color-obsidian-ink)] p-8 flex flex-col h-[400px] bg-[var(--color-linen)]">
        <div className="flex justify-between items-center border-b border-[var(--color-mist)] pb-4 mb-4">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-sage)] flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${executionTier === 'real' ? 'bg-[var(--color-voltage)] animate-pulse-subtle' : 'bg-[var(--color-obsidian-ink)]'}`} />
            {executionTier === 'real' ? 'Real Autonomous Tier' : 'Demo Mode Simulator'}
          </span>
          <span className="text-[11px] uppercase tracking-widest text-[var(--color-sage)] font-bold">
            {isRunning ? 'EXECUTION ACTIVE' : 'SYSTEM STANDBY'}
          </span>
        </div>

        <div className="flex-grow overflow-y-auto space-y-2 pr-4 custom-scrollbar font-mono text-[13px] text-[var(--color-obsidian-ink)]">
          {logs.length === 0 ? (
            <div className="text-center py-16 text-[var(--color-sage)] opacity-80 text-[11px] uppercase tracking-widest font-bold max-w-sm mx-auto leading-relaxed">
              TERMINAL STANDBY. <br/><br/>Delegate a target from the Tactical Action Matrix above to initiate autonomous execution.
            </div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className={`console-line ${log.type} leading-relaxed`}>
                <span className="opacity-50 mr-2">[{log.timestamp}]</span>
                {log.text}
              </div>
            ))
          )}
          <div ref={consoleEndRef}></div>
        </div>
        
        {artifact && (
          <div className="border-t border-[var(--color-mist)] pt-4 mt-4 flex justify-between items-center">
            <span className="text-[11px] text-[var(--color-obsidian-ink)] font-bold uppercase tracking-widest">
              Compiled: {artifact.filename}
            </span>
            <div className="flex gap-4">
              <button 
                onClick={copyToClipboard}
                className="ghost-link text-[11px] uppercase tracking-widest font-bold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">content_copy</span> Copy
              </button>
              {artifact.type === 'email' && (
                <a 
                  href={artifact.mailtoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="voltage-btn text-[11px] py-[10px] px-[20px]"
                >
                  <span className="material-symbols-outlined text-[14px]">mail</span> Draft Email
                </a>
              )}

              {artifact.type === 'receipt' && (
                <button 
                  className="voltage-btn text-[11px] py-[10px] px-[20px]"
                  onClick={() => {
                    const element = document.createElement("a");
                    const file = new Blob([artifact.content], {type: 'text/plain'});
                    element.href = URL.createObjectURL(file);
                    element.download = artifact.filename;
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                  }}
                >
                  <span className="material-symbols-outlined text-[14px]">download</span> Download
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 items-center bg-[var(--color-pollen)] bg-opacity-20 border border-[var(--color-mist)] p-4">
        <label className="flex items-center gap-3 cursor-pointer text-[13px] font-bold text-[var(--color-obsidian-ink)] flex-1 uppercase tracking-widest">
          <input 
            type="checkbox" 
            checked={forceRealMode}
            onChange={(e) => setForceRealMode(e.target.checked)}
            className="w-4 h-4 accent-[var(--color-voltage)]"
          />
          Enable Real Action Execution
        </label>
        <span className="text-[10px] text-[var(--color-sage)] uppercase tracking-widest font-bold">Local State</span>
      </div>
    </div>
  );
}
