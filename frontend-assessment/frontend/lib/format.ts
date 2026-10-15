const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const relativeTimeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
}

// "5 minutes ago", "yesterday", ... Falls back to "just now" under a minute.
export function formatRelativeTime(value: string, now: number = Date.now()): string {
  const time = Date.parse(value);

  if (Number.isNaN(time)) {
    return "Unknown date";
  }

  const seconds = Math.round((time - now) / 1000);

  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= unitSeconds) {
      return relativeTimeFormat.format(Math.round(seconds / unitSeconds), unit);
    }
  }

  return "just now";
}
