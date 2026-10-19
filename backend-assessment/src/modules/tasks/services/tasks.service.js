const { createId } = require('../../../utils/id');
const { readJsonArray, updateJsonArray } = require('../../../utils/jsonStore');
const HttpError = require('../../../utils/httpError');
const { TASKS_FILE_PATH } = require('../../../config');
const activityService = require('../../activity/services/activity.service');

// Callers pass payloads already normalized by taskValidator.

function buildTaskRecord(payload) {
  const now = new Date().toISOString();

  return {
    id: createId(),
    title: payload.title,
    completed: payload.completed,
    createdAt: now,
    updatedAt: now,
  };
}

function findTaskIndex(tasks, taskId) {
  const taskIndex = tasks.findIndex((item) => item.id === taskId);

  if (taskIndex === -1) {
    throw new HttpError(404, 'Task not found.');
  }

  return taskIndex;
}

// Records a task change in the activity log. Called after the task change is
// saved; a failure here is logged rather than thrown, so a client never gets
// an error for a change that actually succeeded.
async function logTaskActivity(action, task, details) {
  const info = `"${task.title}" (id: ${task.id})${details ? `; ${details}` : ''}`;

  try {
    await activityService.createActivity({ action, info });
  } catch (error) {
    console.error(`Failed to record "${action}" activity for task ${task.id}`, error);
  }
}

async function getAllTasks() {
  return readJsonArray(TASKS_FILE_PATH);
}

async function getTaskById(taskId) {
  const tasks = await readJsonArray(TASKS_FILE_PATH);
  return tasks[findTaskIndex(tasks, taskId)];
}

async function createTask(payload) {
  const newTask = buildTaskRecord(payload);

  await updateJsonArray(TASKS_FILE_PATH, (tasks) => {
    tasks.push(newTask);
  });

  await logTaskActivity('task.created', newTask);
  return newTask;
}

async function updateTask(taskId, updates) {
  const updatedTask = await updateJsonArray(TASKS_FILE_PATH, (tasks) => {
    const taskIndex = findTaskIndex(tasks, taskId);
    const task = { ...tasks[taskIndex], updatedAt: new Date().toISOString() };

    // Copy only the editable fields so a request can never overwrite id,
    // createdAt or add arbitrary keys.
    if (updates.title !== undefined) {
      task.title = updates.title;
    }
    if (updates.completed !== undefined) {
      task.completed = updates.completed;
    }

    tasks[taskIndex] = task;
    return task;
  });

  const changed = Object.keys(updates)
    .map((field) => `${field}: ${JSON.stringify(updates[field])}`)
    .join(', ');
  await logTaskActivity('task.updated', updatedTask, changed);

  return updatedTask;
}

async function deleteTask(taskId) {
  const removedTask = await updateJsonArray(TASKS_FILE_PATH, (tasks) => {
    const [removed] = tasks.splice(findTaskIndex(tasks, taskId), 1);
    return removed;
  });

  await logTaskActivity('task.deleted', removedTask);
  return removedTask;
}

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
