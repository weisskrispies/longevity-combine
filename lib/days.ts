/** Show days run on Las Vegas (Pacific) time, so "today" flips at local midnight at the booth. */
const TZ = "America/Los_Angeles";
export const SHOW_DAYS = ["2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18"];

/** "YYYY-MM-DD" for a timestamp, in Pacific time. */
export const ptDay = (t: string | number | Date = Date.now()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t));

/** "Sun 15" for chips, or "Sunday, Nov 15" in sentences. */
export const dayChip = (d: string) => {
  const dt = new Date(`${d}T12:00:00Z`);
  return `${new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" }).format(dt)} ${dt.getUTCDate()}`;
};
export const dayLong = (d: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "short", day: "numeric" }).format(new Date(`${d}T12:00:00Z`));

/** Default board day: today during the show, otherwise all days. */
export const defaultDay = () => (SHOW_DAYS.includes(ptDay()) ? ptDay() : "all");
