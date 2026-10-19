const { createHash, timingSafeEqual } = require('node:crypto');

const HttpError = require('../utils/httpError');

// Hashing both sides gives equal-length buffers, which timingSafeEqual needs,
// without leaking the key's length through an early length check.
function digest(value) {
  return createHash('sha256').update(value).digest();
}

function apiKeyAuth(apiKey) {
  if (!apiKey) {
    return function allowAll(req, res, next) {
      next();
    };
  }

  const expected = digest(apiKey);

  return function requireApiKey(req, res, next) {
    const provided = req.get('X-API-Key');

    if (typeof provided === 'string' && timingSafeEqual(digest(provided), expected)) {
      return next();
    }

    return next(new HttpError(401, 'Missing or invalid API key.'));
  };
}

module.exports = apiKeyAuth;
