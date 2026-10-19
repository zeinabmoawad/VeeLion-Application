# Code Review — VeeLion Backend Assessment

This review covers the Express.js code as it was delivered: the **Tasks** and **Activity Log** modules plus shared utilities. Every finding lists what is wrong, why it matters, and how to fix it. Each one also has a severity:

- **High:** data loss, data corruption or a security hole
- **Medium:** wrong or inconsistent behavior that clients will notice
- **Low:** code health and readability

---

## Strengths

The codebase has a solid base, and the refactor should build on it rather than replace it:

- **Clear module layout.** Code is split into `routes → controllers → services`, with modules under `src/modules/*`.
- **Central error handling.** `HttpError` and `errorHandler` give one error format (`{ error: { message, details? } }`). 5xx errors are logged and their internals are not sent to the client.
- **`asyncHandler`.** It passes rejected promises to the error middleware, which Express 4 does not do on its own.
- **Shared async storage helper.** `utils/jsonStore.js` uses `fs/promises` and handles a missing or empty file.
- **Separate app and server.** `app.js` only builds the app and `server.js` starts it, so the app can be loaded in tests without opening a port.
- **Good IDs and timestamps for tasks.** Tasks get UUIDs plus `createdAt`/`updatedAt`.
- **A good validator already exists.** `taskValidator.js` has an allowlist, returns normalized values and gives clear messages. Nothing calls it yet (see B1).

Most problems come from the **Activity** module not following these patterns, and from the Tasks module not using the tools it already has.

---

## Summary

| ID | Category | Severity | Finding |
|----|----------|----------|---------|
| B1 | Bugs / Security | High | `PATCH /tasks/:id` lets clients overwrite any field, including `id` |
| B2 | Bugs | High | Concurrent writes overwrite each other (lost updates) |
| B3 | Bugs | High | Writes are not atomic, so a crash can corrupt a data file |
| B4 | Bugs | High | A data file holding a non-array value is read as `[]`, and the next write erases it |
| B5 | Bugs | Medium | Validation is copied in three places with conflicting rules |
| B6 | Bugs | Medium | Activity IDs from `Date.now()` can collide |
| B7 | Bugs | Medium | `POST /activity` has no validation |
| B8 | Bugs | Medium | Data paths depend on the working directory |
| B9 | Bugs | Low | A missing `data/` directory causes 500s |
| P1 | Performance | Medium | Activity uses blocking sync file I/O |
| P2 | Performance | Low | Every request reads and parses the whole file; no pagination |
| S1 | Security | High | Mass assignment (same issue as B1) |
| S2 | Security | Medium | Activity input has no limits; stored-XSS risk |
| S3 | Security | Medium | No authentication, rate limiting or security headers |
| M1 | Maintainability | Medium | The two modules follow different patterns |
| M2 | Maintainability | Medium | Response shapes differ between modules |
| M3 | Maintainability | Medium | Task changes are not written to the activity log |
| M4 | Maintainability | Medium | No tests, linting or Node version requirement |
| M5 | Maintainability | Low | Runtime data is committed to git; README has no run instructions |
| Q1 | Code quality | Low | Unclear names in the Activity module |
| Q2 | Code quality | Low | Duplicated `loadDataA` / `loadDataB` |
| Q3 | Code quality | Low | Dead code (`taskValidator.js`, `id.js` fallback) |
| Q4 | Code quality | Low | Controllers change `req.body`; error messages vary |

---

## 1. Bugs

### B1. `PATCH /tasks/:id` lets clients overwrite any field — High

**What is wrong.** `updateTask` merges the request body directly into the stored task (`src/modules/tasks/services/tasks.service.js:75-79`):

```js
const updatedTask = { ...existingTask, ...updates, updatedAt: ... };
```

The controller only checks the types of `title` and `completed`. Every other key in the body is saved.

**Why it is a problem.** This request:

```http
PATCH /tasks/aecc...
{ "title": "ok", "id": "hijacked", "createdAt": "1970-01-01", "isAdmin": true }
```

changes the task's `id`. After that, the original ID returns 404, and two tasks can end up with the same ID. It also lets clients rewrite history (`createdAt`) and add any fields they like to the stored data. This is a classic mass-assignment bug (see also S1).

**How to improve.** Pass only fields from an allowlist into the service. `validateUpdateTask` in `taskValidator.js` already does this: it rejects unknown fields and returns a normalized object. Use it in the controller and pass only its result to the service.

---

### B2. Concurrent writes overwrite each other (lost updates) — High

**What is wrong.** Every change does *read the whole file → change it in memory → write the whole file* with nothing in between to stop overlap (`tasks.service.js` create/update/delete, `activity.service.js` `createNewActivity`).

**Why it is a problem.** Node runs one thing at a time, but `await readFile` / `await writeFile` let other requests run in the gaps. If two `POST /tasks` requests overlap, both read N tasks, both write N+1, and one task is lost even though its client got a `201`. This gets worse once tasks also write to the activity log (M3), because each request then writes more.

**How to improve.** Run all writes to a file one after another through a per-file promise queue (mutex) inside `jsonStore`, for example `updateJsonArray(file, mutatorFn)` that holds the lock for the whole read and write. This works because the app runs as a single process. Running several instances would need a real database.

---

### B3. Writes are not atomic, so a crash can corrupt a data file — High

**What is wrong.** `writeJsonArray` and `fs.writeFileSync` write directly over the existing file.

**Why it is a problem.** If the process crashes, is killed or runs out of disk partway through, the file is left half-written. Every later request then fails `JSON.parse` and returns 500 until someone fixes the file by hand.

**How to improve.** Write to a temporary file in the same directory (`tasks.json.tmp`), then `fs.rename` it over the real file. A rename is atomic on the same filesystem.

---

### B4. A non-array data file is read as `[]`, and the next write erases it — High

**What is wrong.** `src/utils/jsonStore.js:11`:

```js
return Array.isArray(parsed) ? parsed : [];
```

**Why it is a problem.** Suppose the file holds valid JSON that is not an array, for example after a manual edit or a migration that wrapped the data as `{ "tasks": [...] }`. Reads quietly return an empty list, and the next create writes `[newTask]` over the file. All existing data is lost without any error.

**How to improve.** Fail loudly. Throw an error (which becomes a 500 and is logged) when the parsed value is not an array, and never write over a file that could not be read. Silently replacing bad data is worse than returning an error.

---

### B5. Validation is copied in three places with conflicting rules — Medium

**What is wrong.** Task input is checked in the controller, again in the service, and a third, unused version sits in `taskValidator.js`. The rules disagree:

| Rule | Create | Update |
|------|--------|--------|
| Minimum title length | 1 (after trim) | 2 (`tasks.service.js:59`) |
| Unknown fields | ignored | **saved** (B1) |
| Error text for a bad `completed` | `completed must be boolean` | `completed should be bool` |

**Why it is a problem.** A client can create a task titled `"A"` and then cannot save the same title back with `PATCH`. Every rule change has to be made in up to three places, and they will drift further apart over time.

**How to improve.** Make `taskValidator.js` the only place where input is validated and normalized, and call it from the controllers. The service can then assume its input is valid. Decide on one minimum title length; I recommend 1 so that existing records stay valid.

---

### B6. Activity IDs from `Date.now()` can collide — Medium

**What is wrong.** `activity.service.js:40`: `id: String(Date.now())`.

**Why it is a problem.** Two entries created in the same millisecond get the same ID. That happens easily with concurrent requests, and it will be common once task changes write to the activity log automatically (M3). It also differs from tasks, which use UUIDs.

**How to improve.** Use the shared `createId()` (UUID). Existing numeric IDs can stay, because they are unique strings already.

---

### B7. `POST /activity` has no validation — Medium

**What is wrong.** `createNewActivity` copies `b.action` and `b.info` without any checks.

**Why it is a problem.**
- `POST /activity {}` returns `201` and saves `{ id, when }`. `JSON.stringify` drops the `undefined` fields, so the stored record has no `action` at all.
- Any type is accepted: objects, arrays, numbers, or a 100 KB string.
- Reports that count or group by `action` will run into bad records.

**How to improve.** Add `activityValidator.js`, following the task validator. `action` should be a required non-empty string with a length limit. `info` should be an optional string with a length limit. Unknown fields should be rejected.

---

### B8. Data paths depend on the working directory — Medium

**What is wrong.** Both services build their data path from `process.cwd()` (`tasks.service.js:7`, `activity.service.js:4`).

**Why it is a problem.** `npm start` works only from the project root. Running `node backend-assessment/src/server.js` from the parent directory, or from a process manager with a different working directory, makes the app look for `./data` somewhere else. Combined with the "create if missing" logic, it starts with **empty data in the wrong place** instead of failing.

**How to improve.** Resolve paths from the source file (`path.join(__dirname, '../../../../data')`), or better, from one `config` module. Let a `DATA_DIR` environment variable override it, which also lets tests use a temporary directory.

---

### B9. A missing `data/` directory causes 500s — Low

**What is wrong.** `readJsonArray` creates the file on `ENOENT` but not the directory. If `data/` does not exist, `writeFile` fails with `ENOENT` and the request returns 500.

**How to improve.** Call `fs.mkdir(dir, { recursive: true })` once at startup, or before the first write.

---

## 2. Performance

### P1. Activity uses blocking sync file I/O — Medium

**What is wrong.** The Activity module uses `existsSync`, `readFileSync` and `writeFileSync`.

**Why it is a problem.** Sync calls block the event loop. While the file is read or written, the server handles no other request, including task requests. The cost grows with the file, and an activity log only ever grows.

**How to improve.** Use the shared async `jsonStore`, as the Tasks module does. `existsSync` is also unnecessary, because `jsonStore` already handles `ENOENT`.

### P2. Every request reads and parses the whole file; no pagination — Low

**What is wrong.** Every request reads and parses the full file, and `GET /tasks` and `GET /activity` return every record.

**Why it is a problem.** Response size and latency grow without limit. The activity log grows forever, so it will hit this first.

**How to improve.**
- Add `?limit=&offset=` pagination to `GET /activity`, newest entries first, with a sensible default limit. Do the same for `GET /tasks` if it is needed.
- Optionally cache the parsed array in memory and clear it on write. This is safe because all writes go through one process and the queue from B2.
- As data grows, the real fix is a database. That is outside the "JSON files only" constraint, but worth recording.

---

## 3. Security

### S1. Mass assignment — High

This is the same issue as **B1**. It is listed here because of its security impact: clients control fields the server should own (`id`, `createdAt`, `updatedAt`) and can add any keys to stored records. The fix is the allowlist validator.

### S2. Activity input has no limits; stored-XSS risk — Medium

**What is wrong.** Activity `action` and `info` accept any content of any type and length. The only size limit is `express.json`'s default body limit of 100 KB.

**Why it is a problem.** Anyone can fill the log with large or junk entries, which also makes P2 worse. If any client renders `info` as HTML, this is **stored XSS**.

**How to improve.** Validate types and lengths (B7). Set an explicit `express.json({ limit: '10kb' })`. Document that clients must treat activity text as plain text.

### S3. No authentication, rate limiting or security headers — Medium

**What is wrong.** Every endpoint, including `DELETE /tasks/:id` and the writable activity log, is open to anyone who can reach the server. There are no request limits, `helmet` headers or CORS policy, and `X-Powered-By: Express` is sent.

**Why it is a problem.** The README says to assume this code is in production. Anyone can delete every task or forge activity entries, and nothing slows down abuse.

**How to improve.**
- **Now:** add `helmet()` (or at least `app.disable('x-powered-by')`) and `express-rate-limit` on write routes. Configure CORS explicitly, or not at all if the API is only called server to server, as the frontend now does.
- **Later:** add authentication, even a shared API key from an environment variable, before exposing the API publicly. Consider making `POST /activity` internal-only once task changes write their own activity entries (M3).

---

## 4. Maintainability

### M1. The two modules follow different patterns — Medium

| Concern | Tasks | Activity |
|---------|-------|----------|
| File I/O | async `jsonStore` | sync `fs`, its own copy |
| Error wrapping | `asyncHandler` | none |
| IDs | UUID | `Date.now()` |
| Validation | partial (three copies) | none |
| Naming | descriptive | `aSvc`, `x`, `c`, `b` |

**Why it is a problem.** New developers cannot tell which pattern is the right one. Fixes to shared behavior, such as atomic writes or locking, must be made twice, and one copy will be missed.

**How to improve.** Bring Activity in line with the Tasks layout and shared utilities (`jsonStore`, `asyncHandler`, `createId`, a validator). The new Reports module should follow the same layout.

### M2. Response shapes differ between modules — Medium

**What is wrong.** Tasks return `{ data: ... }`. Activity returns a bare array or object.

**Why it is a problem.** Clients need special handling for each endpoint. A bare top-level array also leaves no room to add pagination fields later without breaking clients.

**How to improve.** Use `{ data }` everywhere, with `meta` for pagination. This changes the API for an existing client, so the frontend (or other clients) must be updated in the same release, or the change must be versioned.

### M3. Task changes are not written to the activity log — Medium

**What is wrong.** Creating, updating and deleting a task writes nothing to the activity log. Entries only appear when a client calls `POST /activity` directly.

**Why it is a problem.** The activity log cannot be trusted as an audit trail, and `recentActivityCount` in the planned reports endpoint would mean little.

**How to improve.** Have the tasks service call the activity service after each successful change, for example `{ action: 'task.created', info: taskId }`. Keep the activity service as the only code that writes the log.

### M4. No tests, linting or Node version requirement — Medium

**What is wrong.** `package.json` has no `test` or `lint` script and no `engines` field.

**Why it is a problem.** Nothing protects behavior during the refactor this assessment asks for. The code relies on `Object.hasOwn` (Node ≥ 16.9) and `node --watch` (Node ≥ 18.11) without saying so.

**How to improve.**
- Add `node:test` + `supertest` integration tests that run against a temporary `DATA_DIR` (needs B8).
- Add ESLint and an `"engines": { "node": ">=18.11" }` field.

### M5. Runtime data is committed to git; README has no run instructions — Low

**What is wrong.** `data/*.json` holds runtime data from manual testing ("degraded task", "smoke") and is tracked in git. The README describes the assessment but not how to install, run or configure the service.

**How to improve.** Commit seed files (`data/*.seed.json`, or empty `[]`) and ignore the live files, or keep them and accept that they are fixtures. Add a short "Getting started" section (install, `npm run dev`, `PORT`/`DATA_DIR`, endpoint list).

---

## 5. Code quality

### Q1. Unclear names in the Activity module — Low

`aSvc`, `x`, `c`, `b`, `one`, `made`, `list`, `fp`, and the snake_case `get_activity` mixed with camelCase `addActivity`. These names say nothing about the data and break the conventions used elsewhere in the code. Rename them to `activityService`, `activityController`, `listActivity`, `createActivity`, `ACTIVITY_FILE_PATH`, and so on.

### Q2. Duplicated `loadDataA` / `loadDataB` — Low

`activity.service.js:6-30` contains two identical functions. Any fix applied to one will be missed in the other. Both should be replaced by `readJsonArray`.

### Q3. Dead code — Low

- **`taskValidator.js`** is the best validation code in the project, and nothing imports it. Use it (B5) rather than delete it.
- **The `id.js` fallback.** `crypto.randomUUID` exists on every Node version this project can run on (≥ 14.17), so the `Date.now()`/`Math.random()` fallback never runs. It also produces IDs that are weaker than they look. Remove it.

### Q4. Controllers change `req.body`; error messages vary — Low

- `createTask` and `patchTask` change `req.body` in place (`payload.title = payload.title.trim()`). This hides where values come from and surprises any later middleware. Validators should return a new normalized object, as `taskValidator.js` does.
- Controllers write error responses by hand (`res.status(400).json(...)`) instead of throwing `HttpError`. This skips the central error handler and produces messages like `"bad body type"` and `"completed should be bool"` next to properly worded ones. Throw `HttpError` and let `errorHandler` format the response.

---

## 6. Plan for the refactor and the Reports module

The refactor keeps existing endpoints and behavior, apart from the bug fixes. Recommended order:

1. **Storage safety:** in `jsonStore`, add a per-file write queue (B2), atomic writes (B3), an error on non-array data (B4) and directory creation (B9). Add a `config` module for paths (B8).
2. **Tasks:** use `taskValidator` as the only validation path (B1, B5, Q4), and remove the checks copied into the controller and service.
3. **Activity:** move it onto `jsonStore`, `asyncHandler` and `createId`. Add an activity validator, rename everything clearly, and use the `{ data }` envelope (P1, B6, B7, M1, M2, Q1, Q2).
4. **Integration:** write task changes to the activity log (M3).
5. **Reports:** add `GET /reports/tasks-summary` as `src/modules/reports/{routes,controllers,services}`. The service reads tasks and activity through the existing services.
6. **Hardening and tooling:** `helmet`, rate limiting and a body-size limit (S2, S3); tests, ESLint, `engines` and README updates (M4, M5).

### Note on `byStatus` in the reports endpoint

The example response groups tasks into `todo` / `in-progress` / `done`, but tasks only store a boolean `completed`. There is nothing to count as `in-progress`. The options:

- **Derive from `completed` (recommended).** Count `completed: true` as `done` and `false` as `todo`, and always return `in-progress` as `0` so the response matches the documented shape. The task schema and existing clients are untouched, which matters for code that is assumed to be in production.
- **Add a `status` field.** Make `status` an optional enum on tasks and derive it from `completed` for older records. This matches the example exactly, but it is a schema and API change that needs a migration path for existing clients.

`recentActivityCount` needs a defined time window. The proposed default is the last 7 days, adjustable with `?days=`.
