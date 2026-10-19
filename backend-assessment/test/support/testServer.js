const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Starts the app on a random port against a fresh temporary data directory.
// Config is read when the app is first required, so `env` must be passed here
// and the helper must be called before anything else requires src/app. Each
// test file runs in its own process, so every file gets its own config.
async function startTestServer(env = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'veelion-test-'));

  Object.assign(process.env, {
    DATA_DIR: dataDir,
    WRITE_RATE_LIMIT_PER_MINUTE: '100000',
    ...env,
  });
  if (!('API_KEY' in env)) {
    delete process.env.API_KEY;
  }

  const app = require('../../src/app');
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function request(method, url, { body, rawBody, headers = {} } = {}) {
    const response = await fetch(baseUrl + url, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: rawBody !== undefined ? rawBody : body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();

    return {
      status: response.status,
      headers: response.headers,
      body: text ? JSON.parse(text) : null,
    };
  }

  function filePath(name) {
    return path.join(dataDir, `${name}.json`);
  }

  // Replaces a data file. Removing it first guarantees a new stat signature,
  // so the store's read cache can never serve the previous contents.
  function writeData(name, value) {
    fs.rmSync(filePath(name), { force: true });
    fs.writeFileSync(filePath(name), typeof value === 'string' ? value : JSON.stringify(value));
  }

  function readData(name) {
    return JSON.parse(fs.readFileSync(filePath(name), 'utf8'));
  }

  function resetData() {
    writeData('tasks', []);
    writeData('activity', []);
  }

  async function close() {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dataDir, { recursive: true, force: true });
  }

  return { request, dataDir, writeData, readData, resetData, close };
}

module.exports = { startTestServer };
