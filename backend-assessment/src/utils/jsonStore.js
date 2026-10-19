const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

// Tail of the pending-write chain for each file. Writes to the same file run
// one after another so concurrent read-modify-write cycles cannot overwrite
// each other. This only protects a single process; running several instances
// against the same files would need a real database.
const writeQueues = new Map();

function withFileLock(filePath, task) {
  const key = path.resolve(filePath);
  const previous = writeQueues.get(key) || Promise.resolve();
  const run = previous.then(task);
  const tail = run.catch(() => {});

  writeQueues.set(key, tail);
  tail.then(() => {
    if (writeQueues.get(key) === tail) {
      writeQueues.delete(key);
    }
  });

  return run;
}

async function readJsonArray(filePath) {
  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }

  if (!raw.trim()) {
    return [];
  }

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    // Treating this as [] would let the next write silently erase the file.
    throw new Error(`Expected a JSON array in ${filePath}`);
  }

  return parsed;
}

async function writeJsonArray(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  // Write to a temp file and rename it into place: a rename is atomic, so a
  // crash mid-write leaves the previous file intact instead of a truncated one.
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true });
    throw error;
  }
}

// Reads the array, lets `mutate` change it in place, then writes it back, all
// while holding the file's lock. If `mutate` throws, nothing is written.
// Resolves with whatever `mutate` returns.
function updateJsonArray(filePath, mutate) {
  return withFileLock(filePath, async () => {
    const items = await readJsonArray(filePath);
    const result = await mutate(items);
    await writeJsonArray(filePath, items);
    return result;
  });
}

module.exports = {
  readJsonArray,
  updateJsonArray,
};
