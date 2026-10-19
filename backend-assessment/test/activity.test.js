const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { startTestServer } = require('./support/testServer');

let srv;

before(async () => {
  srv = await startTestServer();
});

after(() => srv.close());

beforeEach(() => srv.resetData());

test('GET /activity returns the log in a data envelope (M2)', async () => {
  const res = await srv.request('GET', '/activity');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { data: [] });
});

test('POST /activity stores a validated entry', async () => {
  const res = await srv.request('POST', '/activity', { body: { action: ' deploy ', info: 'v1.2' } });

  assert.equal(res.status, 201);
  const entry = res.body.data;
  assert.equal(entry.action, 'deploy');
  assert.equal(entry.info, 'v1.2');
  assert.match(entry.id, /^[0-9a-f-]{36}$/);
  assert.ok(!Number.isNaN(Date.parse(entry.when)));
  assert.deepEqual(srv.readData('activity'), [entry]);
});

test('POST /activity rejects invalid bodies (B7)', async () => {
  const cases = [
    {},
    { action: '' },
    { action: 5 },
    { action: 'a'.repeat(101) },
    { action: 'x', info: { nested: true } },
    { action: 'x', info: 'i'.repeat(1001) },
    { action: 'x', extra: 1 },
  ];

  for (const body of cases) {
    assert.equal((await srv.request('POST', '/activity', { body })).status, 400, JSON.stringify(body));
  }
  assert.deepEqual(srv.readData('activity'), []);
});

test('concurrent entries get unique ids and are all saved (B2, B6)', async () => {
  const results = await Promise.all(
    Array.from({ length: 20 }, () => srv.request('POST', '/activity', { body: { action: 'burst' } }))
  );

  assert.equal(new Set(results.map((res) => res.body.data.id)).size, 20);
  assert.equal(srv.readData('activity').length, 20);
});

test('GET /activity supports newest-first order and pagination', async () => {
  const entries = Array.from({ length: 5 }, (_, i) => ({
    id: `a${i}`,
    action: 'x',
    when: new Date(2026, 0, i + 1).toISOString(),
  }));
  srv.writeData('activity', entries);

  const res = await srv.request('GET', '/activity?order=desc&limit=2');
  assert.deepEqual(res.body.data.map((entry) => entry.id), ['a4', 'a3']);
  assert.deepEqual(res.body.meta, { total: 5, limit: 2, offset: 0 });
  assert.equal(res.headers.get('x-total-count'), '5');

  // Reversing for desc must not reorder the cached list for other requests.
  assert.deepEqual((await srv.request('GET', '/activity')).body.data, entries);
  assert.equal((await srv.request('GET', '/activity?order=up')).status, 400);
});
