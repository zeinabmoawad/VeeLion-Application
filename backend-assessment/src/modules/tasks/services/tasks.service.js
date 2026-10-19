const { createId } = require('../../../utils/id');
const { readJsonArray, updateJsonArray } = require('../../../utils/jsonStore');
const HttpError = require('../../../utils/httpError');
const { TASKS_FILE_PATH } = require('../../../config');

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

  return newTask;
}

async function updateTask(taskId, updates) {
  return updateJsonArray(TASKS_FILE_PATH, (tasks) => {
    const taskIndex = findTaskIndex(tasks, taskId);
    const updatedTask = { ...tasks[taskIndex], updatedAt: new Date().toISOString() };

    // Copy only the editable fields so a request can never overwrite id,
    // createdAt or add arbitrary keys.
    if (updates.title !== undefined) {
      updatedTask.title = updates.title;
    }
    if (updates.completed !== undefined) {
      updatedTask.completed = updates.completed;
    }

    tasks[taskIndex] = updatedTask;
    return updatedTask;
  });
}

async function deleteTask(taskId) {
  return updateJsonArray(TASKS_FILE_PATH, (tasks) => {
    const [removedTask] = tasks.splice(findTaskIndex(tasks, taskId), 1);
    return removedTask;
  });
}

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
