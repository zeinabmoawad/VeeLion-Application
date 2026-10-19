const path = require('node:path');

// Resolved from this file rather than process.cwd(), so the server finds its
// data no matter which directory it is started from. DATA_DIR overrides it
// (e.g. to point tests at a temporary directory).
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');

module.exports = {
  DATA_DIR,
  TASKS_FILE_PATH: path.join(DATA_DIR, 'tasks.json'),
  ACTIVITY_FILE_PATH: path.join(DATA_DIR, 'activity.json'),
};
