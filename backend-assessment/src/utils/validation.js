const HttpError = require('./httpError');

// Checks shared by the module validators.

function assertJsonObject(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpError(400, 'Body must be a JSON object.');
  }
}

function assertOnlyFields(payload, allowedFields) {
  const unknownFields = Object.keys(payload).filter((field) => !allowedFields.includes(field));

  if (unknownFields.length > 0) {
    throw new HttpError(400, 'Body contains unsupported fields.', {
      unsupportedFields: unknownFields,
    });
  }
}

module.exports = {
  assertJsonObject,
  assertOnlyFields,
};
