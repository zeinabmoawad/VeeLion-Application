const HttpError = require('../../../utils/httpError');

const ALLOWED_FIELDS = ['action', 'info'];
const MAX_ACTION_LENGTH = 100;
const MAX_INFO_LENGTH = 1000;

function validateCreateActivity(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpError(400, 'Body must be a JSON object.');
  }

  const unknownFields = Object.keys(payload).filter(
    (field) => !ALLOWED_FIELDS.includes(field)
  );
  if (unknownFields.length > 0) {
    throw new HttpError(400, 'Body contains unsupported fields.', {
      unsupportedFields: unknownFields,
    });
  }

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

module.exports = {
  validateCreateActivity,
};
