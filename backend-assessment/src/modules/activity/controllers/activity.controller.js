const activityService = require('../services/activity.service');
const { validateCreateActivity, parseSortOrder } = require('../utils/activityValidator');
const { parsePagination, paginate } = require('../../../utils/pagination');

async function listActivity(req, res) {
  const order = parseSortOrder(req.query.order);
  const pagination = parsePagination(req.query);
  let entries = await activityService.getAllActivity();

  // Entries are appended in time order, so reversing gives newest first.
  // slice() first: the array from the store is shared and must not be mutated.
  if (order === 'desc') {
    entries = entries.slice().reverse();
  }

  if (!pagination) {
    return res.status(200).json({ data: entries });
  }

  const page = paginate(entries, pagination);
  res.set('X-Total-Count', String(page.meta.total));
  return res.status(200).json({ data: page.items, meta: page.meta });
}

async function createActivity(req, res) {
  const payload = validateCreateActivity(req.body);
  const entry = await activityService.createActivity(payload);
  res.status(201).json({ data: entry });
}

module.exports = {
  listActivity,
  createActivity,
};
