const tasksService = require('../services/tasks.service');
const { validateCreateTask, validateUpdateTask } = require('../utils/taskValidator');
const { parsePagination, paginate } = require('../../../utils/pagination');

async function listTasks(req, res) {
  const pagination = parsePagination(req.query);
  const tasks = await tasksService.getAllTasks();

  if (!pagination) {
    return res.status(200).json({ data: tasks });
  }

  const page = paginate(tasks, pagination);
  res.set('X-Total-Count', String(page.meta.total));
  return res.status(200).json({ data: page.items, meta: page.meta });
}

async function getTask(req, res) {
  const task = await tasksService.getTaskById(req.params.id);
  res.status(200).json({ data: task });
}

async function createTask(req, res) {
  const payload = validateCreateTask(req.body);
  const task = await tasksService.createTask(payload);
  res.status(201).json({ data: task });
}

async function patchTask(req, res) {
  const updates = validateUpdateTask(req.body);
  const task = await tasksService.updateTask(req.params.id, updates);
  res.status(200).json({ data: task });
}

async function removeTask(req, res) {
  await tasksService.deleteTask(req.params.id);
  res.status(204).send();
}

module.exports = {
  listTasks,
  getTask,
  createTask,
  patchTask,
  removeTask,
};
