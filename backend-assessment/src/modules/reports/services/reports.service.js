const tasksService = require('../../tasks/services/tasks.service');
const activityService = require('../../activity/services/activity.service');

const DAY_MS = 24 * 60 * 60 * 1000;

// Tasks only store a boolean `completed`, so there is no data to tell an
// in-progress task apart from a todo one. "in-progress" is still reported, as
// 0, so the response keeps the documented shape and will not change when a
// real status field is added.
function getTaskStatus(task) {
  return task.completed === true ? 'done' : 'todo';
}

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// Pure aggregation over already-loaded data, kept separate from I/O so it can
// be tested with fixed inputs and a fixed clock.
function buildTasksSummary(tasks, activity, { days, now }) {
  const byStatus = { todo: 0, 'in-progress': 0, done: 0 };
  for (const task of tasks) {
    byStatus[getTaskStatus(task)] += 1;
  }

  const since = new Date(now.getTime() - days * DAY_MS);
  const recentActivity = activity.filter((entry) => {
    const when = Date.parse(entry.when);
    return !Number.isNaN(when) && when >= since.getTime();
  });

  // Counted in a Map because action names come from clients: a name such as
  // "__proto__" must become a plain key, not change a plain object's prototype.
  const actionCounts = new Map();
  for (const entry of recentActivity) {
    const action = entry.action || 'unknown';
    actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
  }

  const total = tasks.length;

  return {
    total,
    byStatus,
    // Percentage of tasks that are done, to one decimal place; 0 with no tasks.
    completionRate: total === 0 ? 0 : roundTo((byStatus.done / total) * 100, 1),
    recentActivityCount: recentActivity.length,
    recentActivityByAction: Object.fromEntries(actionCounts),
    recentWindow: {
      days,
      since: since.toISOString(),
    },
    generatedAt: now.toISOString(),
  };
}

async function getTasksSummary({ days, now = new Date() }) {
  const [tasks, activity] = await Promise.all([
    tasksService.getAllTasks(),
    activityService.getAllActivity(),
  ]);

  return buildTasksSummary(tasks, activity, { days, now });
}

module.exports = {
  buildTasksSummary,
  getTasksSummary,
};
