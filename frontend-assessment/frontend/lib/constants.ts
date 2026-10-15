import "server-only";

// Server-only on purpose: no NEXT_PUBLIC_ prefix, so the backend address is never inlined
// into the client bundle. The browser only ever talks to the /api/* route handlers.
export const BACKEND_BASE_URL = (process.env.BACKEND_API_URL || "http://localhost:4000").replace(/\/+$/, "");
