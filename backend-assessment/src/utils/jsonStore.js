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

// Parsed contents of each file, keyed by path and tagged with the file's
// stat signature. A read only costs a stat() while the file is unchanged, and
// edits made outside the app are still picked up because they change the
// signature. Our own writes clear the entry.
const readCache = new Map();

function statSignature(stats) {
  return `${stats.mtimeMs}:${stats.size}:${stats.ino}`;
}

async function readFromDisk(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
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

// The returned array may be shared with other requests through the cache:
// callers must treat it as read-only. Changes go through updateJsonArray.
async function readJsonArray(filePath) {
  const key = path.resolve(filePath);

  let stats;
  try {
    stats = await fs.stat(key);
  } catch (error) {
    if (error.code === 'ENOENT') {
      readCache.delete(key);
      return [];
    }

    throw error;
  }

  const signature = statSignature(stats);
  const cached = readCache.get(key);
  if (cached && cached.signature === signature) {
    return cached.items;
  }

  const items = await readFromDisk(key);
  readCache.set(key, { signature, items });
  return items;
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
    const key = path.resolve(filePath);

    // Read a private copy from disk rather than the shared cached array, so a
    // failed mutation or write never leaves half-applied changes in the cache.
    let items;
    try {
      items = await readFromDisk(key);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      items = [];
    }

    const result = await mutate(items);
    try {
      await writeJsonArray(key, items);
    } finally {
      readCache.delete(key);
    }

    return result;
  });
}

module.exports = {
  readJsonArray,
  updateJsonArray,
};
