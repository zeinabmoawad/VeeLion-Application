const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { startTestServer } = require('./support/testServer');

const API_KEY = 'test-key';
const auth = { 'x-api-key': API_KEY };
let srv;

before(async () => {
  srv = await startTestServer({ API_KEY, WRITE_RATE_LIMIT_PER_MINUTE: '5' });
  srv.resetData();
});

after(() => srv.close());

test('requests without a valid API key are rejected', async () => {
  for (const headers of [{}, { 'x-api-key': 'wrong' }]) {
    const res = await srv.request('GET', '/tasks', { headers });
    assert.equal(res.status, 401);
    assert.deepEqual(res.body, { error: { message: 'Missing or invalid API key.' } });
  }

  assert.equal((await srv.request('GET', '/tasks', { headers: auth })).status, 200);
});

test('responses carry security headers and no X-Powered-By', async () => {
  const res = await srv.request('GET', '/tasks', { headers: auth });

  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
});

test('unknown routes return 404 in the standard error format', async () => {
  const res = await srv.request('GET', '/nope', { headers: auth });

  assert.equal(res.status, 404);
  assert.equal(res.body.error.message, 'Route not found: GET /nope');
});

// The tests below send writes and count against the limit of 5 per minute;
// the rate-limit test runs last and relies on that.

test('bodies over 10kb are rejected with 413', async () => {
  const res = await srv.request('POST', '/activity', {
    headers: auth,
    body: { action: 'x', info: 'i'.repeat(20000) },
  });

  assert.equal(res.status, 413);
});

test('malformed JSON gets a generic 400 message', async () => {
  const res = await srv.request('POST', '/tasks', { headers: auth, rawBody: '{"title": ' });

  assert.equal(res.status, 400);
  assert.equal(res.body.error.message, 'Request body is not valid JSON.');
});

test('writes over the per-minute limit get 429; reads are not limited', async () => {
  const statuses = [];
  for (let i = 0; i < 5; i++) {
    statuses.push((await srv.request('POST', '/tasks', { headers: auth, body: { title: `t${i}` } })).status);
  }

  assert.ok(statuses.includes(429), `got ${statuses}`);
  const limited = await srv.request('POST', '/tasks', { headers: auth, body: { title: 'x' } });
  assert.equal(limited.status, 429);
  assert.equal(limited.body.error.message, 'Too many requests, please try again later.');
  assert.ok(limited.headers.get('retry-after'));
  assert.equal((await srv.request('GET', '/tasks', { headers: auth })).status, 200);
});
