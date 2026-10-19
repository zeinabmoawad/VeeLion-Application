const reportsService = require('../services/reports.service');
const { parseRecentDays } = require('../utils/reportsValidator');

async function getTasksSummary(req, res) {
  const days = parseRecentDays(req.query.days);
  const summary = await reportsService.getTasksSummary({ days });
  res.status(200).json({ data: summary });
}

module.exports = {
  getTasksSummary,
};
