const path = require('node:path');

// Resolved from this file rather than process.cwd(), so the server finds its
// data no matter which directory it is started from. DATA_DIR overrides it
// (e.g. to point tests at a temporary directory).
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');

// Express "trust proxy" setting. Leave unset when clients connect directly;
// behind a reverse proxy set it to the number of proxy hops (e.g. "1") so
// req.ip, and therefore rate limiting, sees the real client address.
function parseTrustProxy(value) {
  if (value === undefined || value === '') {
    return undefined;
  }

  return /^\d+$/.test(value) ? Number(value) : value;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

module.exports = {
  DATA_DIR,
  TASKS_FILE_PATH: path.join(DATA_DIR, 'tasks.json'),
  ACTIVITY_FILE_PATH: path.join(DATA_DIR, 'activity.json'),

  // When set, every request must send it in the X-API-Key header. Unset keeps
  // the API open (the original behavior) and the server logs a warning.
  API_KEY: process.env.API_KEY || null,

  // Max POST/PATCH/DELETE requests per client IP per minute.
  WRITE_RATE_LIMIT_PER_MINUTE: parsePositiveInt(process.env.WRITE_RATE_LIMIT_PER_MINUTE, 60),

  JSON_BODY_LIMIT: '10kb',
  TRUST_PROXY: parseTrustProxy(process.env.TRUST_PROXY),
};
