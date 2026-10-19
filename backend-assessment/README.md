# VeeLion Backend Assessment (Express.js)

## Getting started

Requires **Node.js 22+**.

```bash
npm install
npm run seed     # copy sample data from data/seed/ into data/ (skips existing files)
npm run dev      # start with auto-reload on http://localhost:3000
```

| Command | What it does |
|---------|--------------|
| `npm start` | Start the server |
| `npm run dev` | Start with `node --watch` |
| `npm run seed` | Copy sample data into `data/`; `npm run seed -- --force` overwrites |
| `npm test` | Run the test suite (`node:test`, uses temporary data directories) |
| `npm run lint` | Run ESLint |

### Configuration

All settings are optional environment variables.

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | HTTP port |
| `DATA_DIR` | `./data` (next to `src/`) | Where `tasks.json` and `activity.json` are stored |
| `API_KEY` | unset | When set, every request must send it in the `X-API-Key` header. Unset leaves the API open and logs a warning. |
| `WRITE_RATE_LIMIT_PER_MINUTE` | `60` | Max POST/PATCH/DELETE requests per client IP per minute |
| `TRUST_PROXY` | unset | Express `trust proxy` value. Set it to the number of proxy hops (e.g. `1`) behind a reverse proxy. |

The JSON-file storage, write lock, read cache and rate limiter all assume **a single server process**.

### API

Successful responses use `{ "data": ... }`. Errors use `{ "error": { "message", "details?" } }`.

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/tasks` | Optional `?limit=&offset=`, which adds `meta` and an `X-Total-Count` header |
| `GET` | `/tasks/:id` | |
| `POST` | `/tasks` | `{ "title": string, "completed"?: boolean }` |
| `PATCH` | `/tasks/:id` | `{ "title"?: string, "completed"?: boolean }`, at least one field |
| `DELETE` | `/tasks/:id` | `204` on success |
| `GET` | `/activity` | Optional `?order=asc\|desc&limit=&offset=` |
| `POST` | `/activity` | `{ "action": string (≤100), "info"?: string (≤1000) }` |

Task changes are recorded automatically in the activity log as `task.created`, `task.updated` and `task.deleted`.

See [REVIEW.md](REVIEW.md) for the code review behind these changes.

---

## Overview

You are given a partially implemented backend for a **Task Management System** built with Express.js.

The project contains **two modules**:

* A **Tasks API**
* An **Activity Log API**

Your goal is to:

1. Review the existing code
2. Identify strengths and weaknesses
3. Improve the problematic parts
4. Implement a new module that integrates with the existing system

---

## Objectives

This assessment evaluates your ability to:

* **Read and understand** existing code
* **Critically review** code quality
* **Refactor and improve** code safely
* **Design and implement** new features

---

## What You Are Given

* Express.js project

* Two modules:

  * Tasks API
  * Activity Log API

* Data is stored in local JSON files (no database)

---

## Your Tasks

### 1. Code Review

Create a file named:

```
REVIEW.md
```

In it, document:

* All the findings you may want to discuss
* Categorize issues into:

  * Bugs
  * Performance
  * Maintainability
  * Security
  * Code quality

For each issue:

* Explain **what is wrong**
* Explain **why it is a problem**
* Suggest **how to improve it**

---

### 2. Refactor Both Modules

Improve the existing modules

**Important**:

* Don't rewrite everything from scratch
* Maintain existing functionality


---

### 3. Implement a New Module (Reports API)

Create a new module:

```
GET /reports/tasks-summary
```

### Expected Response Example:

```json
{
  "total": 20,
  "byStatus": {
    "todo": 5,
    "in-progress": 10,
    "done": 5
  },
  "recentActivityCount": 12
}
```

### Requirements:

* Read data from both:

  * Tasks JSON
  * Activity JSON
* Aggregate and return meaningful insights
* Follow a clean architecture

---

## Constraints

* Use JSON files only
* Keep the project simple and maintainable
* Assume this code is already in production

---


## Submission Instructions

1. Create a **public GitHub repository**

2. Push the project after your improvements / additions

3. Ensure your repo includes:

   * Updated code
   * `REVIEW.md`
   * Clear commit history

4. Share the repository link

---

## Time Expectation

* Expected time: **~2 days**

---

## AI Usage

You are allowed to use AI tools, but not copy-pasting this document and just pushing the output.

However, you are evaluated on:

* Your understanding of the code
* Your ability to critique and improve it
* Your decision-making



