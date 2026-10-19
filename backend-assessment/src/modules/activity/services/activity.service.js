const { createId } = require('../../../utils/id');
const { readJsonArray, updateJsonArray } = require('../../../utils/jsonStore');
const { ACTIVITY_FILE_PATH } = require('../../../config');

async function getAllActivity() {
  return readJsonArray(ACTIVITY_FILE_PATH);
}

// Expects a payload already normalized by activityValidator.
async function createActivity(payload) {
  const entry = {
    id: createId(),
    action: payload.action,
    info: payload.info,
    when: new Date().toISOString(),
  };

  await updateJsonArray(ACTIVITY_FILE_PATH, (entries) => {
    entries.push(entry);
  });

  return entry;
}

module.exports = {
  getAllActivity,
  createActivity,
};
