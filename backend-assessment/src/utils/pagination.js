const HttpError = require('./httpError');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseNonNegativeInt(value, name) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new HttpError(400, `"${name}" must be a non-negative integer.`);
  }

  return Number(value);
}

// Pagination is opt-in: returns null when neither `limit` nor `offset` is in
// the query, so existing clients keep receiving the full list.
function parsePagination(query) {
  if (query.limit === undefined && query.offset === undefined) {
    return null;
  }

  const limit = query.limit === undefined ? DEFAULT_LIMIT : parseNonNegativeInt(query.limit, 'limit');
  const offset = query.offset === undefined ? 0 : parseNonNegativeInt(query.offset, 'offset');

  if (limit < 1 || limit > MAX_LIMIT) {
    throw new HttpError(400, `"limit" must be between 1 and ${MAX_LIMIT}.`);
  }

  return { limit, offset };
}

function paginate(items, { limit, offset }) {
  return {
    items: items.slice(offset, offset + limit),
    meta: { total: items.length, limit, offset },
  };
}

module.exports = {
  parsePagination,
  paginate,
};
