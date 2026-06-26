import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize Supabase (No persistent sessions for server)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('WARNING: Supabase credentials not fully configured in .env');
}
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
// We use gemini-2.5-flash as the default since the user's account supports it
const geminiModel = 'gemini-1.5-flash';

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Frontend URL
  credentials: true, // Allow cookies to be sent
}));
app.use(express.json());
app.use(cookieParser());

// ── Auth Middleware ───────────────────────────────────────────────────────

const getUserClient = (token) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
};

const authenticate = async (req, res, next) => {
  const token = req.cookies.sb_session;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No session cookie' });
  }

  // Verify the JWT with Supabase
  const db = getUserClient(token);
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid session' });
  }

  req.user = user;
  next();
};

// ── Auth Routes ───────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    // Set the session token as an HttpOnly cookie
    res.cookie('sb_session', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ user: data.user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    });
    if (error) throw error;
    res.json({ message: 'Signup successful' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/auth/session', async (req, res) => {
  const token = req.cookies.sb_session;
  if (!token) return res.json({ user: null });

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    res.json({ user });
  } catch (err) {
    res.cookie('sb_session', '', { maxAge: 0 }); // Clear invalid cookie
    res.json({ user: null });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.cookie('sb_session', '', { maxAge: 0 });
  res.json({ success: true });
});

// ── Data Routes (Tasks) ───────────────────────────────────────────────────

// Proprietary AI orchestration/sorting logic (Moved from frontend)
const sortPrioritizedTasks = (tasks) => {
  return tasks.sort((a, b) => {
    const hoursA = Math.max(0.1, (new Date(a.deadline) - new Date()) / 3600000);
    const hoursB = Math.max(0.1, (new Date(b.deadline) - new Date()) / 3600000);
    const scoreA = 100 * Math.exp(-hoursA / 16) + a.importance * 8;
    const scoreB = 100 * Math.exp(-hoursB / 16) + b.importance * 8;
    return scoreA < scoreB ? 1 : -1;
  });
};

app.get('/api/tasks', authenticate, async (req, res) => {
  try {
    const db = getUserClient(req.cookies.sb_session);
    const { data: tasks, error } = await db
      .from('tasks')
      .select('*')
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    
    // Sort before sending to frontend, hiding the algorithm logic
    const sortedTasks = sortPrioritizedTasks(tasks);
    res.json(sortedTasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', authenticate, async (req, res) => {
  try {
    const db = getUserClient(req.cookies.sb_session);
    const task = req.body;
    const { error } = await db.from('tasks').insert({ ...task, user_id: req.user.id });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks/bulk', authenticate, async (req, res) => {
  try {
    const db = getUserClient(req.cookies.sb_session);
    const { tasks } = req.body;
    const rows = tasks.map(t => ({ ...t, user_id: req.user.id }));
    const { error } = await db.from('tasks').insert(rows);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    const db = getUserClient(req.cookies.sb_session);
    const { error } = await db
      .from('tasks')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    const db = getUserClient(req.cookies.sb_session);
    const { error } = await db
      .from('tasks')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Data Routes (Habits) ──────────────────────────────────────────────────

app.get('/api/habits', authenticate, async (req, res) => {
  try {
    const db = getUserClient(req.cookies.sb_session);
    const { data: habits, error } = await db
      .from('habits')
      .select('*')
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json(habits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/habits/bulk', authenticate, async (req, res) => {
  try {
    const db = getUserClient(req.cookies.sb_session);
    const { habits } = req.body;
    const rows = habits.map(h => ({ ...h, user_id: req.user.id }));
    const { error } = await db.from('habits').insert(rows);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/habits/:id', authenticate, async (req, res) => {
  try {
    const db = getUserClient(req.cookies.sb_session);
    // use upsert since the frontend expects upsert for habits occasionally
    const { error } = await db
      .from('habits')
      .upsert({ ...req.body, user_id: req.user.id }, { onConflict: 'id' });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI Orchestration Routes ───────────────────────────────────────────────

app.post('/api/ai/decompose', authenticate, async (req, res) => {
  const { title } = req.body;
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'AI capabilities not configured on server' });
  }
  
  try {
    const prompt = `Decompose the task: "${title}" into exactly 3 actionable subtasks. Return ONLY a valid JSON array of strings, e.g. ["subtask 1", "subtask 2", "subtask 3"]. Do not include markdown code block syntax.`;
    
    // We use standard fetch here to match the exact payload style previously used,
    // or we could use the generative-ai package. Let's use the package.
    const model = genAI.getGenerativeModel({ model: geminiModel });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Clean potential markdown blocks
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);
    
    res.json({ subtasks: parsed });
  } catch (err) {
    console.error('AI Decompose Error:', err);
    res.status(500).json({ error: 'Task decomposition failed.' });
  }
});

app.post('/api/ai/voice', authenticate, async (req, res) => {
  const { prompt } = req.body;
  try {
    const model = genAI.getGenerativeModel({ model: geminiModel });
    const result = await model.generateContent(prompt);
    res.json({ response: result.response.text() });
  } catch (err) {
    console.error('AI Voice Error:', err);
    res.status(500).json({ error: 'Voice processing failed.' });
  }
});

app.post('/api/ai/agent', authenticate, async (req, res) => {
  const { prompt } = req.body;
  try {
    const model = genAI.getGenerativeModel({ model: geminiModel });
    const result = await model.generateContent(prompt);
    res.json({ response: result.response.text() });
  } catch (err) {
    console.error('AI Agent Error:', err);
    res.status(500).json({ error: 'Agent execution failed.' });
  }
});

app.listen(port, () => {
  console.log(`[Backend] Secure API Server running on port ${port}`);
});
