const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { readJsonArray, updateJsonArray } = require('../src/utils/jsonStore');

let dir;
let file;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'veelion-store-'));
  file = path.join(dir, 'items.json');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function replaceFile(contents) {
  fs.rmSync(file, { force: true });
  fs.writeFileSync(file, contents);
}

test('a missing or empty file reads as an empty array', async () => {
  assert.deepEqual(await readJsonArray(file), []);
  replaceFile('  \n');
  assert.deepEqual(await readJsonArray(file), []);
});

test('a non-array file throws and is never overwritten (B4)', async () => {
  replaceFile('{"items":[]}');

  await assert.rejects(readJsonArray(file), /Expected a JSON array/);
  await assert.rejects(updateJsonArray(file, (items) => items.push(1)), /Expected a JSON array/);
  assert.equal(fs.readFileSync(file, 'utf8'), '{"items":[]}');
});

test('updateJsonArray writes nothing when the mutation throws', async () => {
  replaceFile('[1]');

  await assert.rejects(
    updateJsonArray(file, (items) => {
      items.push(2);
      throw new Error('boom');
    }),
    /boom/
  );
  assert.deepEqual(await readJsonArray(file), [1]);
});

test('concurrent updates are applied one after another (B2)', async () => {
  await Promise.all(
    Array.from({ length: 100 }, (_, i) => updateJsonArray(file, (items) => items.push(i)))
  );

  const items = await readJsonArray(file);
  assert.equal(items.length, 100);
  assert.deepEqual([...items].sort((a, b) => a - b), Array.from({ length: 100 }, (_, i) => i));
});

test('writes leave no temporary files behind (B3)', async () => {
  await updateJsonArray(file, (items) => items.push('a'));
  assert.deepEqual(fs.readdirSync(dir), ['items.json']);
});

test('writes create a missing directory (B9)', async () => {
  const nested = path.join(dir, 'nested', 'deeper', 'items.json');
  await updateJsonArray(nested, (items) => items.push('a'));
  assert.deepEqual(await readJsonArray(nested), ['a']);
});

test('the read cache picks up both own writes and external edits', async () => {
  await updateJsonArray(file, (items) => items.push('a'));
  assert.deepEqual(await readJsonArray(file), ['a']);

  await updateJsonArray(file, (items) => items.push('b'));
  assert.deepEqual(await readJsonArray(file), ['a', 'b']);

  replaceFile('["external"]');
  assert.deepEqual(await readJsonArray(file), ['external']);
});
