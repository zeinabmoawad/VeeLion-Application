const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { startTestServer } = require('./support/testServer');

let srv;

before(async () => {
  srv = await startTestServer();
});

after(() => srv.close());

beforeEach(() => srv.resetData());

async function createTask(body = { title: 'Task' }) {
  const res = await srv.request('POST', '/tasks', { body });
  assert.equal(res.status, 201);
  return res.body.data;
}

test('GET /tasks returns the list in a data envelope', async () => {
  const res = await srv.request('GET', '/tasks');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { data: [] });
});

test('POST /tasks trims the title and defaults completed to false', async () => {
  const task = await createTask({ title: '  Buy milk  ' });

  assert.equal(task.title, 'Buy milk');
  assert.equal(task.completed, false);
  assert.match(task.id, /^[0-9a-f-]{36}$/);
  assert.equal(task.createdAt, task.updatedAt);
  assert.deepEqual(srv.readData('tasks'), [task]);
});

test('POST /tasks rejects invalid bodies', async () => {
  const cases = [
    {},
    { title: '   ' },
    { title: 42 },
    { title: 'ok', completed: 'yes' },
    { title: 'ok', priority: 'high' },
    [{ title: 'ok' }],
  ];

  for (const body of cases) {
    const res = await srv.request('POST', '/tasks', { body });
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(typeof res.body.error.message, 'string');
  }
  assert.deepEqual(srv.readData('tasks'), []);
});

test('GET /tasks/:id returns the task, or 404', async () => {
  const task = await createTask();

  assert.deepEqual((await srv.request('GET', `/tasks/${task.id}`)).body, { data: task });
  const missing = await srv.request('GET', '/tasks/does-not-exist');
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error.message, 'Task not found.');
});

test('PATCH /tasks/:id updates editable fields and bumps updatedAt', async () => {
  const task = await createTask({ title: 'Old' });

  const res = await srv.request('PATCH', `/tasks/${task.id}`, {
    body: { title: ' New ', completed: true },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.title, 'New');
  assert.equal(res.body.data.completed, true);
  assert.equal(res.body.data.createdAt, task.createdAt);
  assert.ok(res.body.data.updatedAt >= task.updatedAt);
});

test('PATCH /tasks/:id cannot overwrite id, createdAt or add fields (B1)', async () => {
  const task = await createTask();

  const res = await srv.request('PATCH', `/tasks/${task.id}`, {
    body: { title: 'ok', id: 'hijacked', createdAt: '1970-01-01' },
  });

  assert.equal(res.status, 400);
  assert.deepEqual(res.body.error.details, { unsupportedFields: ['id', 'createdAt'] });
  assert.deepEqual(srv.readData('tasks'), [task]);
});

test('PATCH /tasks/:id applies the same title rules as create (B5)', async () => {
  const task = await createTask();

  assert.equal((await srv.request('PATCH', `/tasks/${task.id}`, { body: { title: 'A' } })).status, 200);
  assert.equal((await srv.request('PATCH', `/tasks/${task.id}`, { body: { title: '  ' } })).status, 400);
  assert.equal((await srv.request('PATCH', `/tasks/${task.id}`, { body: {} })).status, 400);
  assert.equal((await srv.request('PATCH', '/tasks/nope', { body: { completed: true } })).status, 404);
});

test('DELETE /tasks/:id removes the task, then 404s', async () => {
  const task = await createTask();

  const res = await srv.request('DELETE', `/tasks/${task.id}`);
  assert.equal(res.status, 204);
  assert.equal(res.body, null);
  assert.deepEqual(srv.readData('tasks'), []);
  assert.equal((await srv.request('DELETE', `/tasks/${task.id}`)).status, 404);
});

test('concurrent creates are all saved (B2)', async () => {
  const results = await Promise.all(
    Array.from({ length: 50 }, (_, i) => srv.request('POST', '/tasks', { body: { title: `t${i}` } }))
  );

  assert.ok(results.every((res) => res.status === 201));
  assert.equal(srv.readData('tasks').length, 50);
});

test('GET /tasks supports opt-in pagination', async () => {
  const tasks = Array.from({ length: 30 }, (_, i) => ({ id: `id-${i}`, title: `t${i}`, completed: false }));
  srv.writeData('tasks', tasks);

  const res = await srv.request('GET', '/tasks?limit=5&offset=2');
  assert.deepEqual(res.body.data, tasks.slice(2, 7));
  assert.deepEqual(res.body.meta, { total: 30, limit: 5, offset: 2 });
  assert.equal(res.headers.get('x-total-count'), '30');

  assert.equal((await srv.request('GET', '/tasks?offset=0')).body.data.length, 20);
  assert.equal((await srv.request('GET', '/tasks')).body.meta, undefined);

  for (const query of ['limit=0', 'limit=101', 'limit=abc', 'offset=-1', 'limit=1.5']) {
    assert.equal((await srv.request('GET', `/tasks?${query}`)).status, 400, query);
  }
});

test('task changes are recorded in the activity log (M3)', async () => {
  const task = await createTask({ title: 'Logged' });
  await srv.request('PATCH', `/tasks/${task.id}`, { body: { completed: true } });
  await srv.request('DELETE', `/tasks/${task.id}`);

  const activity = srv.readData('activity');
  assert.deepEqual(
    activity.map((entry) => entry.action),
    ['task.created', 'task.updated', 'task.deleted']
  );
  assert.equal(activity[0].info, `"Logged" (id: ${task.id})`);
  assert.equal(activity[1].info, `"Logged" (id: ${task.id}); completed: true`);
});

test('failed task requests are not logged', async () => {
  await srv.request('POST', '/tasks', { body: {} });
  await srv.request('PATCH', '/tasks/nope', { body: { completed: true } });
  await srv.request('DELETE', '/tasks/nope');

  assert.deepEqual(srv.readData('activity'), []);
});
