// Updates one query param in place: no navigation, no new history entry.
// Passing the existing history.state keeps the Next.js router state intact.
export function replaceSearchParam(key: string, value: string | null): void {
  const url = new URL(window.location.href);

  if (value) {
    url.searchParams.set(key, value);
  } else {
    url.searchParams.delete(key);
  }

  window.history.replaceState(window.history.state, "", url);
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
