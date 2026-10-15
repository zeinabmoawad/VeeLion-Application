# Code Review

This review covers the frontend (`frontend/`): the **Task Dashboard**, the **Activity Feed**, the shared API layer and the styling. Backend issues I found while checking the API contracts are listed briefly at the end. They are outside the scope of this assessment.

For every issue I describe **what was wrong**, **why it matters**, the **suggested improvement**, and the **resolution**: what I actually changed, and where. File and line references in the "What was wrong" parts point to the original code (commit `a1bdc4d`). The fixes were committed section by section, so the history follows this document.

Severity:

- **High**: a bug or crash that users can hit
- **Medium**: wrong behaviour or a maintenance problem that will grow
- **Low**: polish

---

## Summary

### Starting point

| Module | Assessment |
| --- | --- |
| Task Dashboard | Reasonable structure (hook + small components, typed props, accessible buttons), but with state-handling bugs and UX gaps. |
| Activity Feed | The problematic module: redundant derived state, a pointless re-render timer, duplicated functions, no loading or error handling, and it crashes when the API fails. |
| API layer | Clean separation between the proxy routes and `lib/backendApi.ts`, but HTTP status codes were lost, code was duplicated, and the backend URL was exposed to the client. |
| Styling | A few CSS variables, with most layout done through repeated inline `style={{...}}` objects. |

### Status

All 34 findings in sections 1–6 have been addressed.

| Section | Issues | Status |
| --- | --- | --- |
| 1. Bugs / Correctness | 6 | ✅ Fixed |
| 2. Performance | 4 | ✅ Fixed |
| 3. React best practices | 5 | ✅ Fixed |
| 4. UX | 9 | ✅ Fixed |
| 5. Maintainability | 4 | ✅ Fixed |
| 6. Code quality | 6 | ✅ Fixed |
| 7. Backend (out of scope) | 5 | 📝 Documented only |

---

## What was done well (and was kept)

- **Task Dashboard separation of concerns**: data and state live in `useTasks`, and the components are small, presentational and typed. I used the same pattern for the Activity Feed (`useActivity` + components).
- **Derived data is memoised**: `filteredTasks` is computed with `useMemo` instead of being stored in its own state.
- **Accessibility basics**: `aria-pressed` on the filter, descriptive `aria-label`s on the toggles, and `type="button"`.
- **The server is the source of truth**: after a PATCH, the task is replaced with the one the server returns, so `updatedAt` stays correct. This is still true with the optimistic update added in 4.9.
- **The backend is hidden behind Next.js route handlers**: the browser only calls `/api/*`. I strengthened this in 6.2.
- **Shared types** in `types/api.ts` match the documented endpoints.

---

## 1. Bugs / Correctness

### 1.1 Activity Feed crashes when the API returns an error (High)
**File:** `app/activity/page.tsx` lines 48–61

**What was wrong:** The fetch never checked `response.ok`. When the backend was down, `/api/activity` returned `500` with `{ error: { message } }`. That object was stored as the activity list, and `applyFilterA` then called `items.filter(...)` on it, throwing `TypeError: items.filter is not a function`.

**Why it matters:** A backend outage turned into a broken page with no message and no way to recover.

**Suggested improvement:** Check `response.ok`, store an error state, and show an error card with Retry.

**Resolution:**
- All client requests now go through `requestJson` (`lib/http.ts`), which throws on non-2xx responses.
- `useActivity` also checks that the payload is an array before using it.
- The feed shows an error `Alert` with a **Retry** button.
- Verified by stopping the backend: the page shows the error instead of crashing.

### 1.2 Failing to update one task hides the entire task list (High)
**Files:** `hooks/useTasks.ts` line 73, `components/tasks/TaskDashboard.tsx` lines 38–49

**What was wrong:** Load errors and update errors shared one `error` state. The list only rendered when `!loading && !error`, so a single failed toggle replaced the whole list. Its "Retry" button re-loaded the list instead of retrying the update.

**Why it matters:** One failed action made every task disappear, and the button's label didn't match what it did.

**Suggested improvement:** Separate `loadError` (blocks the list) from `updateError` (non-blocking).

**Resolution:**
- `useTasks` now has separate `loadError` and `updateError` states.
- A failed update shows a dismissible error above the list, and the list stays visible.
- **Retry** appears only when the initial load fails, which is the case where it makes sense.

### 1.3 Concurrent toggles show the wrong busy state (Medium)
**File:** `hooks/useTasks.ts` lines 40, 59–77

**What was wrong:** `updatingTaskId` held a single id. Toggling task A and then task B re-enabled A while its request was still running. When A finished, it cleared B's busy state while B's request was still in flight.

**Why it matters:** Buttons were re-enabled during requests that hadn't finished, which allowed duplicate PATCH requests and showed misleading "Saving..." labels.

**Suggested improvement:** Track pending ids in a `Set<string>`.

**Resolution:** `pendingTaskIds: ReadonlySet<string>`. Each request adds its own id when it starts and removes it when it finishes, using immutable updates. `TaskList` passes `busy={pendingTaskIds.has(task.id)}` to each row.

### 1.4 Error parsing in `requestJson` shows raw JSON parse errors to users (Medium)
**File:** `hooks/useTasks.ts` lines 23–30

**What was wrong:** The `throw` inside the `try` was caught by its own `catch`. If the error body wasn't JSON (for example an HTML 502 page), users saw `Unexpected token '<' ...`.

**Why it matters:** Users saw confusing technical messages, and the control flow was hard to follow.

**Suggested improvement:** Parse the error body with a safe helper, then throw once.

**Resolution:**
- `parseErrorMessage` in `lib/http.ts` reads the backend's error shape and falls back to "Request failed with status N" when the body isn't JSON.
- `requestJson` throws a single `ApiError(message, status)`.
- A unit test covers the non-JSON error body case.

### 1.5 Proxy routes turn every backend error into `500` (Medium)
**Files:** `app/api/tasks/route.ts`, `app/api/tasks/[id]/route.ts`, `app/api/activity/route.ts`

**What was wrong:**
- Backend `404` and `400` errors reached the browser as `500`.
- A network failure was also `500`.
- A PATCH with an invalid JSON body caused `request.json()` to throw, so the client got `500` instead of `400`.

**Why it matters:** The client couldn't tell "not found" or "bad input" from "server broken", and monitoring would count user errors as server errors.

**Suggested improvement:** Carry the status in a typed error and forward it. Return `400` for unparsable bodies.

**Resolution:**
- `backendApi.ts` throws `ApiError`s that carry the backend's status. An unreachable backend becomes `502 "Backend service is unavailable."`.
- `handleRouteError` (`lib/apiResponse.ts`) forwards that status to the browser.
- The PATCH route returns `400` when the body isn't valid JSON.
- Checked against the running servers: PATCH on an unknown id → `404`, invalid JSON → `400`, backend stopped → `502`.

### 1.6 No protection against stale responses or unmounting (Low)
**Files:** `hooks/useTasks.ts` lines 42–57, `app/activity/page.tsx` lines 48–61

**What was wrong:** Fetches were never aborted. Clicking Retry quickly could let an older response overwrite a newer one.

**Suggested improvement:** Use an `AbortController` and ignore `AbortError`.

**Resolution:**
- `useTasks` and `useActivity` keep the current `AbortController` in a ref.
- A new load aborts the previous one, and unmounting aborts the one in flight.
- `AbortError` is ignored, and `loading` is cleared only by the latest request.

---

## 2. Performance

### 2.1 Activity Feed re-renders forever on a 1.4 s timer (High)
**File:** `app/activity/page.tsx` lines 63–83

**What was wrong:** A `setInterval` incremented `tick` every 1400 ms. Each tick ran the search filter twice and rebuilt `forcedList`, cloning every item on odd ticks. That came to about three renders per tick with new object identities, even when nothing had changed. The only use of `tick` (`stats.everySecondTick`) was never rendered.

**Why it matters:** Wasted CPU and battery, growing with the size of the feed, and any memoised children were invalidated on every tick.

**Suggested improvement:** Remove `tick`, the interval and `forcedList`. If live updates are needed, poll the API instead.

**Resolution:** The interval, `tick` and `forcedList` are gone. The feed now renders only when the data or the search text changes. I didn't add live polling, because live updates weren't a requirement (see "Remaining work").

### 2.2 Derived data is stored in state and synced with effects (Medium)
**File:** `app/activity/page.tsx`

**What was wrong:** `shownActivity` and `forcedList` were derived from `allActivity` and `query` but kept in their own state and updated with effects. That caused extra renders and a frame of stale data.

**Suggested improvement:** Keep only the source data and the query in state, and derive the visible list.

**Resolution:** `const visibleActivity = useMemo(() => filterActivity(activity, query), [activity, query])` in `useActivity`. Only `activity`, `query`, `loading` and `error` are stored in state.

### 2.3 Refetching unmounts the whole list (Low)
**File:** `components/tasks/TaskDashboard.tsx` line 47

**What was wrong:** Any refetch set `loading`, which unmounted the list (a flicker, and the scroll position was lost).

**Suggested improvement:** Block the UI only on the first load.

**Resolution:**
- `initialLoading = loading && tasks.length === 0` controls the full loading state.
- Later refetches keep the list on screen and show a small "Refreshing" spinner in the page header.

### 2.4 Unstable callback props (Low)
**File:** `components/tasks/TaskDashboard.tsx` line 20

**What was wrong:** `handleToggle` was recreated on every render, so memoising rows wasn't possible.

**Suggested improvement:** Use `useCallback` and `React.memo`.

**Resolution:** `handleToggle` uses `useCallback`, and `TaskItem` is wrapped in `memo`. Toggling one task now re-renders only that row.

---

## 3. React best practices

### 3.1 Helper functions are declared inside the component (Medium)
**File:** `app/activity/page.tsx` lines 14–46

**What was wrong:** The pure helpers (`formatTimeA/B`, `applyFilterA/B`) were recreated every render and used in effects without being listed as dependencies.

**Suggested improvement:** Move pure helpers into `lib/`.

**Resolution:** The helpers now live in `lib/`, where they can be reused and unit-tested:
- `lib/activity.ts`: `filterActivity`, `sortActivityNewestFirst`
- `lib/format.ts`: `formatDateTime`, `formatRelativeTime`
- `lib/tasks.ts`: `filterTasks`, `countTasks`, `parseTaskFilter`, `getEmptyTasksMessage`

### 3.2 `useEffect` used for derivation instead of synchronisation (Medium)
**File:** `app/activity/page.tsx` lines 71–83

**What was wrong:** Effects were used to compute values from other state.

**Resolution:** Derived values are now computed during render (see 2.2). The only effects left synchronise with things outside React: fetching data, aborting requests, and the debounced URL update in 4.7.

### 3.3 Data fetching for the Activity Feed is inline in the page (Medium)
**File:** `app/activity/page.tsx`

**What was wrong:** Fetching, filtering, formatting and rendering all lived in one 130-line page component.

**Suggested improvement:** Follow the Task Dashboard's hook-plus-components pattern.

**Resolution:**
- `hooks/useActivity.ts` handles fetching, loading, errors, cancelling old requests, search and the derived list.
- `components/activity/` contains `ActivityFeed`, `ActivitySearch`, `ActivityList` and `ActivityItem`.
- The page only composes them.

### 3.4 The whole Activity page is a client component (Low)
**Files:** `app/activity/page.tsx` line 1

**What was wrong:** `"use client"` on the page put everything into the client bundle.

**Suggested improvement:** Keep the page as a Server Component and mark only the interactive part as client.

**Resolution:**
- `app/tasks/page.tsx` and `app/activity/page.tsx` are Server Components. They read the URL's search params on the server (see 4.7) and render a single client component, `TaskDashboard` or `ActivityFeed`.
- The home page is the exception: it became a client component when the UI moved to Ant Design (see "Decisions and trade-offs").

### 3.5 Empty-string sentinels instead of `null` (Low)
**File:** `hooks/useTasks.ts` lines 39–40

**What was wrong:** `""` meant "no error" and "no task updating".

**Resolution:** Errors are `string | null`, and the pending tasks are a `Set` (see 1.3).

---

## 4. UX issues

### 4.1 The Activity Feed has no loading, error or empty states (High)
**What was wrong:** While loading, the page showed "Total: 0 | Visible: 0". On failure it crashed. When a search matched nothing, the list area was blank.

**Resolution:** Every state now has its own message, using the shared `StateMessage` component:
- **Loading:** a spinner.
- **Error:** an `Alert` with a Retry button.
- **No data:** "No activity yet."
- **No search results:** *No activity matches "x"* with a **Clear search** button.

### 4.2 Each activity timestamp is rendered twice (Medium)
**What was wrong:** `formatTimeA` and `formatTimeB` were identical, so every entry showed the same date twice.

**Resolution:** The time is shown once, as relative time ("6 months ago") inside a `<time dateTime>` element, with the exact date in a tooltip. Task rows use the same format.

### 4.3 The activity order is not defined (Medium)
**What was wrong:** Entries were shown in file order (oldest first).

**Resolution:** `sortActivityNewestFirst` sorts newest first, and entries with invalid dates go to the end. The page description says "newest first".

### 4.4 The search input has no label (Medium, accessibility)
**What was wrong:** The input had only a placeholder, which screen readers don't reliably announce.

**Resolution:** The input now has an `aria-label`, uses `type="search"`, has a search icon and a built-in clear button, and **Escape** clears it.

### 4.5 The empty-state text is misleading (Low)
**What was wrong:** "No tasks match this filter." appeared even when there were no tasks at all.

**Resolution:** `getEmptyTasksMessage` picks the right message: "No tasks yet.", "No completed tasks yet." or "No pending tasks. Everything is done!".

### 4.6 The filters do not show counts (Low)
**Resolution:**
- The status filter (an Ant Design `Segmented` control) shows a count badge for each status.
- A `Progress` bar shows "N of M completed".
- The counts are computed once with `countTasks` and memoised.

### 4.7 The filter and search are lost on reload or when sharing a link (Low)
**Resolution:** The filter and search are stored in the URL as `?status=` and `?q=`:
- **On load:** the page reads them on the server and passes them in as initial values. Invalid values fall back to the defaults.
- **When they change:** the client updates the URL with `history.replaceState`, which doesn't trigger a navigation. The search waits 300 ms after typing stops.

### 4.8 The status is shown only as a neutral text badge (Low)
**Resolution:** The status is a colour-coded `Tag`, green for "Completed" and amber for "Pending". The text label is kept, so colour isn't the only signal. Completed titles are also struck through.

### 4.9 There is no feedback after a successful action (Low)
**Resolution:** Toggles are **optimistic**: the checkbox flips immediately, and if saving fails it flips back with an error message. While a task is saving, its checkbox is replaced by a small spinner.

---

## 5. Maintainability

### 5.1 HTTP client logic is duplicated in three places (Medium)
**What was wrong:** `useTasks`, `backendApi.ts` (three near-identical blocks) and the Activity page each handled fetch errors differently. Bugs 1.1 and 1.4 came from that inconsistency.

**Resolution:**
- `lib/http.ts` (`requestJson`, `ApiError`, `parseErrorMessage`) is the one client-side HTTP helper.
- `backendApi.ts` has a single private `backendFetch` used by every endpoint function.

### 5.2 Inline styles are used instead of reusable classes (Medium)
**What was wrong:** There were 43 inline `style={{…}}` uses, and colours such as `#e3b4c0` were hard-coded instead of using theme variables.

**Resolution:**
- **First pass:** I moved all styling into CSS classes and design variables, and created the shared `StateMessage` and `PageHeader` components.
- **Final UI:** the app now uses **Ant Design 5**. Styling comes from the components and one theme configuration in `components/layout/AppShell.tsx` (brand colour, corner radius, fonts).
- **Remaining CSS:** `globals.css` holds only page layout and a few details Ant Design has no setting for.
- **Remaining inline styles:** just a few, all of them values from Ant Design's theme or ones that depend on data (such as progress width).

### 5.3 Repeated page layout and back navigation (Low)
**Resolution:** `app/layout.tsx` renders a shared `AppShell` with a header (the brand plus a `Menu` that highlights the current page). The per-page "Back" buttons are gone.

### 5.4 Dead or unused code (Low)
**Resolution:**
- `stats.everySecondTick` and the `stats` memo are removed.
- `tasks` from `useTasks` is now used (for counts, progress and empty states).
- The duplicated helpers are removed (6.1).

---

## 6. Code quality

### 6.1 Duplicate functions with meaningless suffixes (Medium)
**What was wrong:** `formatTimeA`/`formatTimeB` and `applyFilterA`/`applyFilterB` were duplicates, and the filter ran twice. Names like `forcedList` and `tick` described nothing.

**Resolution:** There is now one well-named helper of each kind (`formatDateTime`, `filterActivity`), and the meaningless state variables are gone.

### 6.2 The backend URL uses a `NEXT_PUBLIC_` env var for server-only code (Medium, security/config)
**What was wrong:** `NEXT_PUBLIC_BACKEND_API_URL` was only read on the server, but the prefix inlined it into the client bundle.

**Resolution:**
- The variable is renamed to **`BACKEND_API_URL`**, and `.env.example` is updated.
- `lib/constants.ts` and `lib/backendApi.ts` import `"server-only"`, so importing them from client code fails the build.
- Checked: no client bundle file mentions the backend URL or the env var.

### 6.3 Try/catch blocks that only rethrow (Low)
**What was wrong:** Each backend function caught errors only to rethrow `new Error(error.message)`, losing the original stack.

**Resolution:** The wrappers are removed. `backendFetch` catches only where it adds meaning: an unreachable backend becomes `502`, and a non-JSON body becomes `502`.

### 6.4 Unsafe type assertions on API data (Low)
**What was wrong:** `(await response.json()) as T` trusted the payload completely, which is how issue 1.1 happened.

**Resolution:**
- `lib/validators.ts` (`parseTask`, `parseActivityLog`, `parseList`) checks backend data at the proxy boundary.
- A response with the wrong overall shape becomes `502`.
- Individual malformed entries are skipped and logged on the server, so one bad row doesn't break the page.
- Non-text `action` and `info` values (which the backend doesn't validate) are dropped.
- I wrote these small checks by hand instead of adding `zod`. With only two data types it isn't worth a dependency, but the checks should move to a schema library as the API grows.

### 6.5 Inconsistent response shapes (Low)
**What was wrong:** The task endpoints returned `{ data }`, while activity (and reports) returned raw arrays or objects.

**Resolution:**
- Every `/api/*` route now returns `{ data }`, typed as `DataResponse<T>` in `types/api.ts`.
- The backend's own raw activity shape is handled only inside `backendApi.ts`.

### 6.6 No linting or tests are set up (Low)
**Resolution:**
- `npm run lint`: `next lint` with `eslint-config-next` (`next/core-web-vitals`). Clean, with no warnings.
- `npm run typecheck`: `tsc --noEmit`.
- `npm test`: Vitest. **30 unit tests in 5 files** cover:
  - response validation
  - activity search and sorting
  - task filtering, counts and empty messages
  - relative-time formatting
  - HTTP error parsing, including the non-JSON error body from 1.4

---

## Decisions and trade-offs

- **Ant Design for the UI.** I chose it for consistent, accessible components (`Segmented`, `Progress`, `Timeline`, `Alert`, `Empty`) and one theme configuration. The costs:
  - **Bundle size:** each page loads about 225–290 kB of JavaScript, up from about 90 kB.
  - **Client components:** every component that uses Ant Design must run on the client.
- **Making Ant Design's styles render on the server** needed two fixes:
  - `@ant-design/nextjs-registry` puts Ant Design's CSS into the server-rendered HTML.
  - `@ant-design/cssinjs` is pinned to the same version antd uses. Without the pin, the registry installs its own copy and no CSS reaches the server-rendered page, so every page flashes unstyled on first load.

