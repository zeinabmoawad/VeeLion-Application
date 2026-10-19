// Copies the sample data in data/seed/ into the data directory.
// Existing files are kept unless --force is passed.
//
//   npm run seed
//   npm run seed -- --force

const fs = require('node:fs');
const path = require('node:path');

const { DATA_DIR } = require('../src/config');

const SEED_DIR = path.join(__dirname, '..', 'data', 'seed');
const force = process.argv.includes('--force');

fs.mkdirSync(DATA_DIR, { recursive: true });

for (const name of fs.readdirSync(SEED_DIR).filter((file) => file.endsWith('.json'))) {
  const target = path.join(DATA_DIR, name);

  if (fs.existsSync(target) && !force) {
    console.log(`skip    ${target} (exists; use --force to overwrite)`);
    continue;
  }

  fs.copyFileSync(path.join(SEED_DIR, name), target);
  console.log(`seeded  ${target}`);
}
