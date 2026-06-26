export function mapTaskToDb(task, userId) {
  const toISO = (val) => val ? new Date(val).toISOString() : null;
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    deadline: toISO(task.deadline),
    importance: Number(task.importance) || 3,
    difficulty: Number(task.difficulty) || 3,
    est_hours: Number(task.estHours) || 1,
    completed: Boolean(task.completed),
    scheduled_time: toISO(task.scheduledTime),
    subtasks: task.subtasks || [],
    gcal_event_id: task.gcalEventId || null,
  };
}

export function mapDbTaskToLocal(row) {
  return {
    id: row.id,
    title: row.title,
    deadline: row.deadline,
    importance: row.importance,
    difficulty: row.difficulty,
    estHours: row.est_hours,
    completed: row.completed,
    scheduledTime: row.scheduled_time,
    subtasks: row.subtasks || [],
    gcalEventId: row.gcal_event_id || null,
  };
}

export function mapHabitToDb(habit, userId) {
  return {
    id: habit.id,
    user_id: userId,
    name: habit.name,
    streak: habit.streak,
    completed: habit.completed,
  };
}

export function mapDbHabitToLocal(row) {
  return {
    id: row.id,
    name: row.name,
    streak: row.streak,
    completed: row.completed,
  };
}
