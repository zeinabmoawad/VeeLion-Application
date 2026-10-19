const aSvc = require('../services/activity.service');
const { validateCreateActivity } = require('../utils/activityValidator');
const { parsePagination, paginate } = require('../../../utils/pagination');
const HttpError = require('../../../utils/httpError');

function parseOrder(order) {
  if (order === undefined || order === 'asc' || order === 'desc') {
    return order || 'asc';
  }

  throw new HttpError(400, '"order" must be "asc" or "desc".');
}

async function get_activity(req, res) {
  const order = parseOrder(req.query.order);
  const pagination = parsePagination(req.query);
  let x = await aSvc.getAllActivity();

  // Entries are appended in time order, so reversing gives newest first.
  // slice() first: the array from the store is shared and must not be mutated.
  if (order === 'desc') {
    x = x.slice().reverse();
  }

  if (!pagination) {
    return res.json(x);
  }

  // The bare-array response has no room for metadata, so the total goes in a
  // header (the response shape is kept for existing clients).
  const page = paginate(x, pagination);
  res.set('X-Total-Count', String(page.meta.total));
  return res.json(page.items);
}

async function addActivity(req, res) {
  const payload = validateCreateActivity(req.body);
  const made = await aSvc.createNewActivity(payload);
  res.status(201).json(made);
}

module.exports = {
  get_activity,
  addActivity,
};
