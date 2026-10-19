const HttpError = require('../../../utils/httpError');

const DEFAULT_RECENT_DAYS = 7;
const MAX_RECENT_DAYS = 365;

// Reads the optional `days` query parameter: how far back activity counts as
// "recent".
function parseRecentDays(days) {
  if (days === undefined) {
    return DEFAULT_RECENT_DAYS;
  }

  if (typeof days !== 'string' || !/^\d+$/.test(days)) {
    throw new HttpError(400, '"days" must be a positive integer.');
  }

  const parsed = Number(days);
  if (parsed < 1 || parsed > MAX_RECENT_DAYS) {
    throw new HttpError(400, `"days" must be between 1 and ${MAX_RECENT_DAYS}.`);
  }

  return parsed;
}

module.exports = {
  parseRecentDays,
};
