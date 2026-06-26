// Google Calendar integration for Rush-Q
// Uses Google Identity Services (GIS) — no npm package needed

const CLIENT_ID = '398046381834-2b8dvjc1f0no0alrn5vcq5rqttgfgq25.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let tokenClient = null;
let accessToken = null;
let tokenExpiry = null;

// ── Initialize token client (call once on app load) ──────────────────────────
export function initGoogleCalendar() {
  return new Promise((resolve, reject) => {
    if (typeof window.google === 'undefined') {
      reject(new Error('Google Identity Services not loaded yet'));
      return;
    }
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        accessToken = response.access_token;
        tokenExpiry = Date.now() + (response.expires_in - 60) * 1000;
        resolve(accessToken);
      },
    });
    resolve(null); // initialized but no token yet
  });
}

// ── Request OAuth access token (triggers Google popup) ───────────────────────
export function requestCalendarAccess() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google Calendar not initialized. Call initGoogleCalendar() first.'));
      return;
    }
    // Override callback for this specific call
    tokenClient.callback = (response) => {
      if (response.error) { reject(new Error(response.error)); return; }
      accessToken = response.access_token;
      tokenExpiry = Date.now() + (response.expires_in - 60) * 1000;
      resolve(accessToken);
    };
    // If token is still valid, resolve immediately
    if (accessToken && Date.now() < tokenExpiry) {
      resolve(accessToken);
      return;
    }
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

// ── Check if we currently have a valid token ─────────────────────────────────
export function hasCalendarAccess() {
  return !!accessToken && Date.now() < tokenExpiry;
}

// ── Push a single Rush-Q task to Google Calendar ─────────────────────────────
export async function pushTaskToCalendar(task) {
  if (!accessToken) throw new Error('No calendar access. Call requestCalendarAccess() first.');

  const deadline = new Date(task.deadline);
  const estMs = (task.estHours || 1) * 3600000;
  const start = new Date(deadline.getTime() - estMs);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Color: 11=red (importance 5), 6=tangerine (4), 5=banana (3), 2=sage (1-2)
  const colorMap = { 5: '11', 4: '6', 3: '5', 2: '2', 1: '2' };
  const colorId = colorMap[task.importance] || '5';

  const event = {
    summary: `⚡ ${task.title}`,
    description: [
      `Rush-Q Priority Task`,
      `Priority Score: ${task.rushScore || 'N/A'} / 100`,
      `Importance: ${task.importance} / 5`,
      `Complexity: ${task.difficulty} / 5`,
      `Estimated focus time: ${task.estHours}h`,
      task.completed ? '✓ Completed' : '⚡ Pending',
    ].join('\n'),
    start: { dateTime: start.toISOString(), timeZone: tz },
    end:   { dateTime: deadline.toISOString(), timeZone: tz },
    colorId,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
    source: {
      title: 'Rush-Q',
      url: window.location.origin,
    },
  };

  const url = task.gcalEventId
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${task.gcalEventId}`
    : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

  const method = task.gcalEventId ? 'PUT' : 'POST';

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Calendar API error');
  }

  const data = await response.json();
  return data.id; // Google Calendar event ID
}

// ── Delete a task's calendar event ───────────────────────────────────────────
export async function deleteCalendarEvent(gcalEventId) {
  if (!accessToken || !gcalEventId) return;
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${gcalEventId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
}

// ── Bulk sync all incomplete tasks to Calendar ────────────────────────────────
export async function syncAllTasksToCalendar(tasks) {
  const results = [];
  for (const task of tasks) {
    if (task.completed) continue;
    try {
      const eventId = await pushTaskToCalendar(task);
      results.push({ taskId: task.id, gcalEventId: eventId, success: true });
    } catch (e) {
      results.push({ taskId: task.id, success: false, error: e.message });
    }
  }
  return results;
}
