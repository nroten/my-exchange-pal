// Date helpers anchored to America/New_York (EST/EDT).
// The "current day" rolls over at midnight Eastern time.

const EST_TZ = 'America/New_York';

/** Returns YYYY-MM-DD for the given date in Eastern time (defaults to now). */
export function getESTDateString(d: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: EST_TZ }).format(d);
}

/** Adds (or subtracts) calendar days from a YYYY-MM-DD string. */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Human-friendly label like "Today", "Yesterday", or "Mon, Nov 4". */
export function formatDateLabel(dateStr: string): string {
  const today = getESTDateString();
  const yesterday = addDaysToDateString(today, -1);
  const tomorrow = addDaysToDateString(today, 1);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  if (dateStr === tomorrow) return 'Tomorrow';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  }).format(dt);
}
