# Code Review

This review covers the frontend (`frontend/`): the **Task Dashboard**, the **Activity Feed**, the shared API layer and the styling. Backend issues I found while checking the API contracts are listed briefly at the end. They are outside the scope of this assessment.

Each issue has a severity:

- **High**: a bug or crash that users can hit
- **Medium**: wrong behaviour or a maintenance problem that will grow
- **Low**: polish

## Summary

| Module | Overall |
| --- | --- |
| Task Dashboard | Reasonable structure (hook + small components, typed props, accessible buttons). It has a few state-handling bugs and UX gaps. |
| Activity Feed | This is the problematic module. It has redundant derived state, a pointless re-render timer, duplicated functions, no loading or error handling, and it crashes when the API fails. |
| API layer | Clean separation between the proxy routes and `lib/backendApi.ts`. However, HTTP status codes are lost, the code is duplicated, and the backend URL env var is exposed to the client unnecessarily. |
| Styling | A small set of CSS variables, but most layout is done with repeated inline `style={{...}}` objects. |

---

## What is done well

These are worth keeping during the refactor:

- **Task Dashboard separation of concerns**: data and state live in `useTasks`. `TaskDashboard`, `StatusFilter`, `TaskList` and `TaskItem` are small presentational components with typed props.
- **Derived data is memoised**: `filteredTasks` is computed with `useMemo` from `tasks` and `filter` instead of being stored in its own state.
- **Accessibility basics**: `aria-pressed` on the filter buttons, a descriptive `aria-label` on each toggle button, `type="button"` on buttons, and an `aria-label` on the list section.
- **The server state is the source of truth**: after a PATCH, the task is replaced with the one the server returns, so `updatedAt` stays correct.
- **The backend is hidden behind Next.js route handlers**: the browser only calls `/api/*`, so there are no CORS issues and the backend URL can change without touching client code.
- **Shared types** in `types/api.ts` match the documented endpoints.

---

## 1. Bugs / Correctness

### 1.1 Activity Feed crashes when the API returns an error (High)
**File:** `app/activity/page.tsx` lines 48–61

**What is wrong:** The fetch never checks `response.ok`. When the backend is down, `/api/activity` returns `500` with `{ error: { message } }`. That object is stored as `allActivity`, and `applyFilterA` then calls `items.filter(...)` on a plain object. This throws `TypeError: items.filter is not a function` and the whole page crashes.

**Why it matters:** A backend outage turns into a broken page with no message and no way to recover.

**Suggested improvement:** Check `response.ok` and parse the error shape. Store an `error` state and show an error card with a Retry button, the same way the Task Dashboard does. Ideally, reuse one shared `requestJson` helper (see 5.1).

### 1.2 Failing to update one task hides the entire task list (High)
**Files:** `hooks/useTasks.ts` line 73, `components/tasks/TaskDashboard.tsx` lines 38–49

**What is wrong:** Load errors and update errors both go into the same `error` state. The list only renders when `!loading && !error`. So when a single toggle fails, the whole list is replaced by an error card. Its "Retry" button calls `fetchTasks`, which re-loads the list. It does not retry the update that failed.

**Why it matters:** One failed action makes all tasks disappear, and the Retry label does not match what it actually does.

**Suggested improvement:** Separate `loadError` (blocks the list) from `updateError` (an inline or toast message on the affected task). Keep the list visible when an update fails.

### 1.3 Concurrent toggles show the wrong busy state (Medium)
**File:** `hooks/useTasks.ts` lines 40, 59–77

**What is wrong:** `updatingTaskId` holds a single id. Suppose a user clicks task A and then task B before A finishes:
- B becomes "busy", and A's button is re-enabled while its request is still in flight.
- When A finishes, `finally { setUpdatingTaskId("") }` clears the busy state of **B**, even though B's request is still running.

**Why it matters:** Buttons get re-enabled during requests that are still running, which allows duplicate PATCHes and misleading "Saving..." labels.

**Suggested improvement:** Track pending ids in a `Set<string>`, adding the id on start and removing it on finish. Alternatively, keep per-task status on the task itself.

### 1.4 Error parsing in `requestJson` shows raw JSON parse errors to users (Medium)
**File:** `hooks/useTasks.ts` lines 23–30

**What is wrong:** The `throw` inside the `try` is caught by its own `catch`, which works only by accident. If the error body is not JSON (for example an HTML 502 from a proxy), `response.json()` throws a `SyntaxError`. Its message, such as `Unexpected token '<' ...`, is then shown to the user instead of the fallback text.

**Why it matters:** Users see confusing technical messages, and the control flow is hard to follow.

**Suggested improvement:** Parse the body separately with a safe helper (like `parseError` in `lib/backendApi.ts`), then throw once:
```ts
if (!response.ok) throw new Error(await parseErrorMessage(response));
```

### 1.5 Proxy routes turn every backend error into `500` (Medium)
**Files:** `app/api/tasks/route.ts`, `app/api/tasks/[id]/route.ts`, `app/api/activity/route.ts`

**What is wrong:**
- A backend `404 Task not found` or `400 validation error` reaches the browser as `500`.
- A network failure (backend unreachable) is also `500`; `502 Bad Gateway` would be more accurate.
- In the PATCH route, an invalid JSON body makes `request.json()` throw, so the client gets `500` instead of `400`.

**Why it matters:** The client cannot tell "not found" or "bad input" apart from "server broken", so it cannot react correctly (for example, removing a deleted task from the list). Monitoring would also count user errors as server errors.

**Suggested improvement:** Throw a typed `ApiError` that carries `status` from `backendApi.ts`, and forward that status in the route handlers. Return `400` when the request body cannot be parsed.

### 1.6 No protection against stale responses or unmounting (Low)
**Files:** `hooks/useTasks.ts` lines 42–57, `app/activity/page.tsx` lines 48–61

**What is wrong:** The fetch effects never abort. Clicking "Retry" quickly, or leaving the page during a request, can make an older response overwrite a newer one, or set state after the component has unmounted.

**Suggested improvement:** Use an `AbortController` inside the effect and abort it in the cleanup function. Ignore `AbortError` in the catch block.

---

## 2. Performance

### 2.1 Activity Feed re-renders forever on a 1.4 s timer (High)
**File:** `app/activity/page.tsx` lines 63–83

**What is wrong:** A `setInterval` increments `tick` every 1400 ms. `tick` is a dependency of two effects. Every tick re-runs the search filter **twice** (A then B) and then rebuilds `forcedList`. On odd ticks it also clones every item (`{ ...item }`). Each tick therefore produces 3 renders and new object identities for the whole list, even when nothing has changed. The only visible use of `tick`, `stats.everySecondTick`, is never rendered.

**Why it matters:** CPU and battery are wasted, and the cost grows with the length of the feed. Any memoised child components would also be invalidated on every tick, because the objects are new each time.

**Suggested improvement:** Remove `tick`, the interval and `forcedList` entirely. If live updates are a real requirement, poll the **API** (for example every 30 s, paused when the tab is hidden) instead of re-rendering local data.

### 2.2 Derived data is stored in state and synced with effects (Medium)
**File:** `app/activity/page.tsx`

**What is wrong:** `shownActivity` and `forcedList` are both derived from `allActivity` and `query`, yet they are kept in their own state and updated with `useEffect`. Every change to `query` causes an extra render, and for one frame the screen shows stale data.

**Suggested improvement:** Keep only `activity` and `query` in state, and derive the visible list:
```ts
const visible = useMemo(() => filterActivity(activity, query), [activity, query]);
```

### 2.3 Refetching unmounts the whole list (Low)
**File:** `components/tasks/TaskDashboard.tsx` line 47

**What is wrong:** `fetchTasks` sets `loading = true`, so on Retry or any refetch the list disappears and comes back (a flicker), and scroll position is lost.

**Suggested improvement:** Show the full loading state only on the first load (`loading && tasks.length === 0`). For later refetches, show a subtle "refreshing" indicator.

### 2.4 Unstable callback props (Low)
**File:** `components/tasks/TaskDashboard.tsx` line 20

**What is wrong:** `handleToggle` is recreated on every render, so `TaskItem` cannot be memoised effectively. This does not matter at the current list size. It will matter if the list grows or items get heavier.

**Suggested improvement:** Wrap the callback in `useCallback`, and wrap `TaskItem` in `React.memo` once there is a measured need.

---

## 3. React best practices

### 3.1 Helper functions are declared inside the component (Medium)
**File:** `app/activity/page.tsx` lines 14–46

**What is wrong:** `formatTimeA`, `formatTimeB`, `applyFilterA` and `applyFilterB` are pure functions. Because they are declared inside the component, they are recreated every render and are used inside effects without being listed as dependencies (this triggers the `react-hooks/exhaustive-deps` warning).

**Suggested improvement:** Move pure helpers to module scope or to `lib/` (for example `lib/format.ts` and `lib/activity.ts`) so they can be reused and unit-tested.

### 3.2 `useEffect` used for derivation instead of synchronisation (Medium)
**File:** `app/activity/page.tsx` lines 71–83

**What is wrong:** Effects are used to compute values from other state. React's guidance ("You might not need an effect") is to compute these during render.

**Suggested improvement:** See 2.2.

### 3.3 Data fetching for the Activity Feed is inline in the page (Medium)
**File:** `app/activity/page.tsx`

**What is wrong:** Fetching, filtering, formatting and rendering all live in one 130-line page component. This is unlike the Task Dashboard, which already has a good hook-plus-components pattern.

**Suggested improvement:** Follow the Task Dashboard structure:
- `hooks/useActivity.ts` for fetching, loading, error and refetch
- `components/activity/ActivityFeed.tsx`, `ActivitySearch.tsx`, `ActivityList.tsx` and `ActivityItem.tsx`

The page then only composes them.

### 3.4 The whole Activity page is a client component (Low)
**Files:** `app/activity/page.tsx` line 1, and the Task Dashboard by extension

**What is wrong:** `"use client"` on the page forces everything into the client bundle, including the static header and navigation. In the Task Dashboard, `TaskList`, `TaskItem` and `StatusFilter` become client components only because they are imported from a client component. That is fine, but it is not an explicit decision.

**Suggested improvement:** Keep `page.tsx` as a Server Component that renders the static layout, and put `"use client"` only on the interactive feed component. In the future, the initial data could be fetched on the server and passed in as a prop.

### 3.5 Empty-string sentinels instead of `null` (Low)
**File:** `hooks/useTasks.ts` lines 39–40

**What is wrong:** `error` and `updatingTaskId` use `""` to mean "none". It works, but it is implicit and easy to get wrong (an empty error message would be treated as "no error").

**Suggested improvement:** Use `string | null`, or a discriminated status: `"idle" | "loading" | "error" | "success"`.

---

## 4. UX issues

### 4.1 The Activity Feed has no loading, error or empty states (High)
**File:** `app/activity/page.tsx`

**What is wrong:** While loading, the user sees "Total: 0 | Visible: 0" and an empty card. On failure the page crashes (1.1). When a search matches nothing, the list area is just blank.

**Suggested improvement:** Add a skeleton or "Loading activity…" while loading, an error card with Retry, and an empty state with distinct messages for "No activity yet" and "No results for '<query>'".

### 4.2 Each activity timestamp is rendered twice (Medium)
**File:** `app/activity/page.tsx` lines 124–126

**What is wrong:** `formatTimeA` and `formatTimeB` are identical, so every item shows the same date twice.

**Suggested improvement:** Render it once inside a `<time dateTime={item.when}>` element. Consider relative time ("5 min ago") with the absolute date in a `title` attribute.

### 4.3 The activity order is not defined (Medium)
**File:** `app/activity/page.tsx`

**What is wrong:** Items are shown in file order, which is oldest first. A feed is normally newest first.

**Suggested improvement:** Sort by `when` in descending order, as part of the derived list.

### 4.4 The search input has no label (Medium, accessibility)
**File:** `app/activity/page.tsx` lines 104–109

**What is wrong:** There is only a placeholder. Screen readers do not reliably announce placeholders, and the placeholder disappears once the user starts typing.

**Suggested improvement:** Add a `<label>` (it can be visually hidden) or an `aria-label`, use `type="search"`, and add a clear button.

### 4.5 The empty-state text is misleading (Low)
**File:** `components/tasks/TaskList.tsx` line 14

**What is wrong:** "No tasks match this filter." is shown even when there are no tasks at all and the filter is "All".

**Suggested improvement:** Show "No tasks yet" when the full list is empty, and "No completed/pending tasks" when a filter is active.

### 4.6 The filters do not show counts (Low)
**File:** `components/tasks/StatusFilter.tsx`

**What is wrong:** Users cannot see how many tasks are in each status without clicking each filter.

**Suggested improvement:** Show counts in the buttons, for example "All (12) · Completed (5) · Pending (7)". They are cheap to compute from `tasks`.

### 4.7 The filter and search are lost on reload or when sharing a link (Low)
**What is wrong:** The `filter` and `query` values live only in component state.

**Suggested improvement:** Sync them to the URL search params (`?status=pending`, `?q=...`).

### 4.8 The status is shown only as a neutral text badge (Low)
**File:** `components/tasks/TaskItem.tsx` line 21

**What is wrong:** "Completed" and "Pending" use the same grey badge, so they are hard to tell apart at a glance.

**Suggested improvement:** Use status variants (`badge--success` / `badge--pending`) together with the text. Do not rely on colour alone.

### 4.9 There is no feedback after a successful action (Low)
**What is wrong:** A toggle succeeds silently. The only change is the badge text.

**Suggested improvement:** Consider an optimistic update with rollback on failure, so the UI feels instant. At minimum, make the visual state change obvious.

---

## 5. Maintainability

### 5.1 HTTP client logic is duplicated in three places (Medium)
**Files:** `hooks/useTasks.ts` (`requestJson`, `getErrorMessage`), `lib/backendApi.ts` (three almost identical `fetch` + `parseError` blocks), `app/activity/page.tsx` (raw `fetch`)

**What is wrong:** Each place handles errors differently, and the bugs in 1.1 and 1.4 come directly from that inconsistency. The new Reports page would add a fourth copy.

**Suggested improvement:**
- `lib/http.ts`: one `requestJson<T>()` with consistent error parsing and an `ApiError` class that carries `status`.
- `lib/backendApi.ts`: a single private `backendFetch<T>(path, init)` used by all endpoint functions.
- Client code (`useTasks`, `useActivity`, `useReports`) uses `requestJson`.

### 5.2 Inline styles are used instead of reusable classes (Medium)
**Files:** almost every component

**What is wrong:** `style={{ padding: "1rem" }}` appears on most cards. Muted text, list resets and flex rows are repeated inline. The dashboard error card hard-codes `#e3b4c0` and `#fff8fa` instead of using the theme variables. In `app/page.tsx`, `.stack` is overridden with `gridTemplateColumns` inline.

**Why it matters:** Changes to the visual design have to be made in many places, the styles are hard to keep consistent, and the hard-coded colours bypass the theme.

**Suggested improvement:** Move the styling to CSS (CSS Modules or utility classes). Add `--danger-soft` and `--danger-border` tokens, and create small UI primitives that the Reports page can also use: `Card`, `Button`, `Badge`, `StateMessage` (loading/error/empty) and `PageHeader`.

### 5.3 Repeated page layout and back navigation (Low)
**Files:** `app/tasks/page.tsx`, `app/activity/page.tsx`

**What is wrong:** Each page builds its own `<main>` and "Back" link. There is no shared navigation between modules, and the Reports page would repeat the same code.

**Suggested improvement:** Put a header and nav (Tasks · Activity · Reports) in `app/layout.tsx` with active-link styling. Remove the per-page Back buttons.

### 5.4 Dead or unused code (Low)
- `useTasks` returns `tasks`, but nothing uses it.
- `stats.everySecondTick` is computed but never rendered.
- `useMemo` for `stats` adds nothing, because its inputs are primitives and the work is trivial.

**Suggested improvement:** Remove them.

---

## 6. Code quality

### 6.1 Duplicate functions with meaningless suffixes (Medium)
**File:** `app/activity/page.tsx`

**What is wrong:**
- `formatTimeA` and `formatTimeB` are identical.
- `applyFilterA` and `applyFilterB` do the same thing (`includes` versus `indexOf !== -1`), and the second runs on the output of the first, so the filter is applied twice for no reason.
- Names like `forcedList` and `tick` do not describe what the values mean.

**Suggested improvement:** Keep one well-named helper of each kind: `formatDateTime` and `filterActivity`.

### 6.2 The backend URL uses a `NEXT_PUBLIC_` env var for server-only code (Medium, security/config)
**Files:** `lib/constants.ts`, `.env.example`

**What is wrong:** `NEXT_PUBLIC_BACKEND_API_URL` is only read by server route handlers. The `NEXT_PUBLIC_` prefix inlines the value into the client bundle, which exposes the internal backend address to the browser for no benefit.

**Suggested improvement:** Rename it to `BACKEND_API_URL` (server-only). Optionally, import `"server-only"` in `lib/backendApi.ts` so that importing it from a client component fails at build time.

### 6.3 Try/catch blocks that only rethrow (Low)
**File:** `lib/backendApi.ts`

**What is wrong:** Each function wraps its body in a `try/catch` that rethrows `new Error(error.message)`. This discards the original stack and `cause`, and adds nothing.

**Suggested improvement:** Remove the wrapper, or rethrow with `{ cause: error }` if context is needed.

### 6.4 Unsafe type assertions on API data (Low)
**Files:** `hooks/useTasks.ts`, `lib/backendApi.ts`, `app/activity/page.tsx`

**What is wrong:** `(await response.json()) as T` trusts the response completely. Issue 1.1 is a direct result of this, since an error object was treated as `ActivityLog[]`.

**Suggested improvement:** At minimum, check `response.ok` and run `Array.isArray` checks where arrays are expected. For a production app, validate responses at the boundary (for example with `zod`).

### 6.5 Inconsistent response shapes (Low)
**What is wrong:** The tasks endpoints are wrapped in `{ data }`, while activity and reports return raw objects or arrays. The proxy routes pass these shapes through unchanged, so each client needs to know which convention applies to which endpoint.

**Suggested improvement:** Normalise the shape in the Next.js proxy layer (for example, always `{ data }`), so client code handles one shape.

### 6.6 No linting or tests are set up (Low)
**File:** `package.json`

**What is wrong:** There is no `lint` script and no ESLint config (`eslint-config-next` would have flagged 3.1). There are also no tests for pure logic such as filtering and error parsing.

**Suggested improvement:** Add `next lint` with `eslint-config-next`. Add a few unit tests for helpers (`filterActivity`, `parseErrorMessage`).

---

## 7. Backend observations (out of scope)

I noticed these while checking the API contracts. They are noted here but will not be changed as part of this frontend assessment.

- **`recentActivityCount` counts all activity**, not recent activity (`reports.service.js`). The Reports UI should label it accordingly, or the backend should filter by a time window.
- **`byStatus["in-progress"]` is always `0`** because tasks only have a boolean `completed`. The Reports UI should not suggest that a real three-state workflow exists.
- **Task changes are not logged to the activity feed**: `createNewActivity` is only called from `POST /activity`.
- **`taskValidator.js` is never used**: `tasks.service.js` re-implements weaker validation. For example, it does not trim the title, and `createTask` mutates its input.
- **`activity.service.js`** has duplicated `loadDataA`/`loadDataB`, uses synchronous `fs` calls inside request handlers, and generates ids with `Date.now()`, which can collide.

---

## Planned refactor (priority order)

1. **Activity Feed**: remove the timer and the redundant state, derive the visible list, add loading/error/empty states, sort newest first, extract `useActivity` and the components, and fix the crash.
2. **Shared HTTP layer**: create `lib/http.ts` with an `ApiError` class; forward status codes in the proxy routes; rename the env var.
3. **Task Dashboard**: separate the load and update errors, track pending updates in a `Set`, show the full loading state only on first load, improve the empty states, and add filter counts.
4. **UI primitives and styling**: replace inline styles with classes and tokens; add a shared navigation layout.
5. **Reports page** (`/reports`), built on the same primitives and HTTP layer.
