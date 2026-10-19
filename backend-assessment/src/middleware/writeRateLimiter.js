const { rateLimit } = require('express-rate-limit');

const HttpError = require('../utils/httpError');

const READ_METHODS = ['GET', 'HEAD', 'OPTIONS'];

// Limits only requests that change data. Counters live in memory, which fits
// the single-process deployment the JSON-file storage already requires.
function writeRateLimiter(limitPerMinute) {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: limitPerMinute,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: (req) => READ_METHODS.includes(req.method),
    handler: (req, res, next) => {
      next(new HttpError(429, 'Too many requests, please try again later.'));
    },
  });
}

module.exports = writeRateLimiter;
