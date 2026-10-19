const HttpError = require('../../../utils/httpError');
const { assertJsonObject, assertOnlyFields } = require('../../../utils/validation');

const ALLOWED_FIELDS = ['action', 'info'];
const MAX_ACTION_LENGTH = 100;
const MAX_INFO_LENGTH = 1000;
const SORT_ORDERS = ['asc', 'desc'];

function validateCreateActivity(payload) {
  assertJsonObject(payload);
  assertOnlyFields(payload, ALLOWED_FIELDS);

  if (typeof payload.action !== 'string' || !payload.action.trim()) {
    throw new HttpError(400, '"action" is required and must be a non-empty string.');
  }

  const action = payload.action.trim();
  if (action.length > MAX_ACTION_LENGTH) {
    throw new HttpError(400, `"action" must be at most ${MAX_ACTION_LENGTH} characters.`);
  }

  const normalized = { action };

  if (payload.info !== undefined) {
    if (typeof payload.info !== 'string') {
      throw new HttpError(400, '"info" must be a string.');
    }

    if (payload.info.length > MAX_INFO_LENGTH) {
      throw new HttpError(400, `"info" must be at most ${MAX_INFO_LENGTH} characters.`);
    }

    normalized.info = payload.info;
  }

  return normalized;
}

// Reads the optional `order` query parameter; defaults to oldest first.
function parseSortOrder(order) {
  if (order === undefined) {
    return 'asc';
  }

  if (!SORT_ORDERS.includes(order)) {
    throw new HttpError(400, '"order" must be "asc" or "desc".');
  }

  return order;
}

module.exports = {
  validateCreateActivity,
  parseSortOrder,
};
