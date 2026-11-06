/**
 * Norms and scoring. Single source of truth for coach, report and board.
 * Each test converts a raw result to an estimated percentile (1-99) against
 * people of the same sex and age. See NORMS.md for sources.
 * STATUS: DRAFT pending Nicole/Katie sign-off. Some rows are estimates.
 */
export type Sex = "F" | "M";
export type TestId = "grip" | "balance" | "wallsit" | "pushups" | "floor";
export type Scores = Partial<Record<TestId, number>>;
type Anchors = number[]; // P5, P25, P50, P75, P95
interface Row { a: number; b: number; F: Anchors; M: Anchors }

const PCTS = [5, 25, 50, 75, 95];
const r1 = (x: number) => Math.round(x * 10) / 10;
const row = ([a, b, M, F]: [number, number, Anchors, Anchors]): Row => ({ a, b, M, F });
// Springer 2007 eyes-closed means; percentiles modeled from the mean (estimate).
const balRow = (a: number, b: number, f: number, m: number): Row => {
  const s = (v: number) => [r1(v * 0.15), r1(v * 0.45), r1(v * 0.8), r1(v * 1.4), r1(Math.min(60, v * 3))];
  return { a, b, F: s(f), M: s(m) };
};
// Groove provisional wall-sit curve (no published norms).
const wallRow = (a: number, b: number, p: number): Row => {
  const s = [Math.round(p * 0.25), Math.round(p * 0.6), p, Math.round(Math.min(120, p * 1.5)), Math.round(Math.min(120, p * 2.2))];
  return { a, b, F: s, M: s };
};

const NORMS: Record<TestId, Row[]> = {
  // iGRIPS international norms 2025, best hand, kg
  grip: ([
    [0, 24, [33.9, 41.9, 48.0, 54.5, 63.6], [19.7, 24.9, 28.6, 32.6, 39.1]], [25, 29, [35.5, 43.5, 49.3, 55.3, 64.0], [20.0, 25.4, 29.4, 33.6, 39.7]],
    [30, 34, [35.0, 43.6, 49.7, 55.9, 64.9], [19.6, 25.4, 29.7, 34.2, 40.4]], [35, 39, [33.8, 43.0, 49.5, 56.0, 65.3], [19.0, 25.1, 29.7, 34.3, 40.8]],
    [40, 44, [32.3, 42.0, 48.8, 55.5, 65.1], [18.3, 24.8, 29.4, 34.1, 40.8]], [45, 49, [30.6, 40.6, 47.6, 54.5, 64.4], [17.6, 24.1, 28.9, 33.6, 40.4]],
    [50, 54, [28.9, 39.0, 46.2, 53.2, 63.1], [16.9, 23.4, 28.2, 32.9, 39.7]], [55, 59, [27.2, 37.2, 44.4, 51.5, 61.4], [16.1, 22.6, 27.3, 31.9, 38.6]],
    [60, 64, [25.5, 35.2, 42.4, 49.5, 59.3], [15.2, 21.6, 26.2, 30.8, 37.4]], [65, 69, [23.7, 33.1, 40.1, 47.2, 56.8], [14.3, 20.6, 25.0, 29.4, 35.8]],
    [70, 74, [21.9, 30.9, 37.7, 44.7, 54.1], [13.2, 19.3, 23.6, 27.9, 34.1]], [75, 79, [20.0, 28.4, 35.1, 41.9, 51.1], [12.0, 17.9, 22.1, 26.2, 32.2]],
    [80, 84, [18.0, 25.9, 32.3, 39.0, 48.0], [10.7, 16.4, 20.4, 24.4, 30.2]], [85, 89, [15.9, 23.2, 29.4, 35.9, 44.6], [9.3, 14.8, 18.6, 22.4, 28.0]],
    [90, 120, [13.7, 20.4, 26.3, 32.7, 41.2], [7.8, 13.1, 16.7, 20.4, 25.7]],
  ] as [number, number, Anchors, Anchors][]).map(row),
  balance: [balRow(0, 39, 13.1, 16.9), balRow(40, 49, 13.5, 12.0), balRow(50, 59, 7.9, 8.6), balRow(60, 69, 3.6, 5.1), balRow(70, 79, 3.7, 2.6), balRow(80, 120, 2.1, 1.8)],
  // CSEP-PATH; men full, women knees. 70+ extrapolated.
  pushups: ([
    [0, 29, [8, 22, 25, 29, 40], [4, 15, 18, 21, 35]], [30, 39, [5, 17, 19, 22, 35], [3, 13, 16, 20, 31]], [40, 49, [4, 13, 15, 17, 30], [2, 11, 13, 15, 29]],
    [50, 59, [3, 10, 11, 13, 26], [0, 7, 9, 11, 27]], [60, 69, [2, 8, 9, 11, 22], [0, 5, 8, 12, 20]], [70, 120, [1, 6, 7, 9, 18], [0, 4, 6, 9, 16]],
  ] as [number, number, Anchors, Anchors][]).map(row),
  // Sitting-rising test; estimates consistent with Araujo 2020.
  floor: ([
    [0, 39, [6.5, 8.5, 9.5, 10, 10], [6.5, 8.5, 9.5, 10, 10]], [40, 49, [5.5, 7.5, 8.5, 9.5, 10], [5, 7, 8.5, 9.5, 10]], [50, 59, [4.5, 6.5, 7.5, 8.5, 9.5], [4, 6, 7.5, 8.5, 9.5]],
    [60, 69, [3, 5, 6.5, 7.5, 9], [2.5, 4.5, 6, 7.5, 9]], [70, 79, [1.5, 3.5, 5, 6.5, 8], [1, 3, 4.5, 6, 8]], [80, 120, [0.5, 2, 3.5, 5, 7], [0, 1.5, 3, 4.5, 6.5]],
  ] as [number, number, Anchors, Anchors][]).map(row),
  wallsit: [wallRow(0, 39, 60), wallRow(40, 49, 50), wallRow(50, 59, 45), wallRow(60, 69, 35), wallRow(70, 79, 25), wallRow(80, 120, 18)],
};

export const TESTS: Record<TestId, { name: string; short: string; unit: string; step: number; max: number; mode?: "decimal" | "numeric"; hint?: string }> = {
  grip: { name: "Grip strength", short: "Grip", unit: "kg", step: 0.5, max: 90, mode: "decimal", hint: "Stronger hand, best of 2 tries." },
  balance: { name: "One-leg balance, eyes closed", short: "Balance", unit: "sec", step: 0.5, max: 60, mode: "decimal", hint: "Seconds on the stopwatch. Stop at 60." },
  wallsit: { name: "Wall sit", short: "Wall sit", unit: "sec", step: 1, max: 120, mode: "numeric", hint: "Seconds on the stopwatch. Stop at 120 (2:00 Club)." },
  pushups: { name: "Push-ups", short: "Push-ups", unit: "reps", step: 1, max: 99, mode: "numeric", hint: "Count in 60 seconds. Men full, women from knees." },
  floor: { name: "Floor rise", short: "Floor rise", unit: "/10", step: 0.5, max: 10 },
};
export const ORDER: TestId[] = ["grip", "balance", "wallsit", "pushups", "floor"];
export const BRACKETS = [["u40", "Under 40", 0, 39], ["40s", "40s", 40, 49], ["50s", "50s", 50, 59], ["60s", "60s", 60, 69], ["70p", "70+", 70, 120]] as const;
export const bracketOf = (age: number) => (BRACKETS.find((b) => age >= b[2] && age <= b[3]) ?? BRACKETS[0])[0];

const anchorsFor = (t: TestId, age: number, sex: Sex) => {
  const rows = NORMS[t];
  return (rows.find((r) => age >= r.a && age <= r.b) ?? rows[rows.length - 1])[sex];
};

export function percentile(t: TestId, age: number, sex: Sex, raw: number | null | undefined): number | null {
  if (raw == null || isNaN(raw)) return null;
  if (raw <= 0) return 1;
  const an = anchorsFor(t, age, sex), xs = [0, ...an], ys = [0, ...PCTS];
  let p = 0;
  if (raw >= an[4]) {
    const extra = an[4] * 0.3 || 1;
    p = 95 + Math.min(4, ((raw - an[4]) / extra) * 4);
    if (an[3] === an[4]) p = 95;
  } else {
    for (let i = 0; i < xs.length - 1; i++) {
      if (raw >= xs[i] && raw <= xs[i + 1]) { p = xs[i + 1] === xs[i] ? ys[i + 1] : ys[i] + ((raw - xs[i]) / (xs[i + 1] - xs[i])) * (ys[i + 1] - ys[i]); break; }
    }
  }
  return Math.max(1, Math.min(99, Math.round(p)));
}

/** Raw value at a given percentile (used for typical, top 10%, and projections). */
export function valueAt(t: TestId, age: number, sex: Sex, p: number): number {
  const an = anchorsFor(t, age, sex), xs = [0, ...an], ys = [0, ...PCTS];
  let v = an[4];
  if (p > 95) v = an[4] * (1 + ((p - 95) / 4) * 0.3);
  else for (let i = 0; i < ys.length - 1; i++) if (p >= ys[i] && p <= ys[i + 1]) { v = xs[i] + ((p - ys[i]) / (ys[i + 1] - ys[i])) * (xs[i + 1] - xs[i]); break; }
  const s = TESTS[t].step;
  return Math.max(0, Math.min(TESTS[t].max, Math.round(v / s) * s));
}

export type Tier = "building" | "solid" | "strong" | "elite";
export const TIER: Record<Tier, string> = { building: "Building", solid: "Solid", strong: "Strong", elite: "Elite" };
export const tierOf = (p: number): Tier => (p >= 90 ? "elite" : p >= 75 ? "strong" : p >= 25 ? "solid" : "building");

export interface Person { age: number; sex: Sex; scores: Scores }
export function pointsOf(p: Person): Partial<Record<TestId, number>> {
  const o: Partial<Record<TestId, number>> = {};
  ORDER.forEach((t) => { const v = p.scores[t]; if (v != null) o[t] = percentile(t, p.age, p.sex, v)!; });
  return o;
}
export const combine = (p: Person) => Object.values(pointsOf(p)).reduce((a, b) => a + (b ?? 0), 0);
export const isFull = (p: Person) => ORDER.every((t) => p.scores[t] != null);
export const fmt = (t: TestId, v: number | null | undefined) =>
  v == null ? "" : t === "wallsit" ? `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, "0")}` : Number.isInteger(v) ? String(v) : v.toFixed(1);
export const unitOf = (t: TestId) => (t === "wallsit" ? "" : TESTS[t].unit === "/10" ? "of 10" : TESTS[t].unit);
export function clampScore(t: TestId, v: number) { const T = TESTS[t]; return Math.max(0, Math.min(T.max, Math.round(v / T.step) * T.step)); }

/** Age at which their results match the median, averaged across tests (estimate). */
export function movementAge(p: Person) {
  const ests = ORDER.filter((t) => p.scores[t] != null).map((t) => {
    const v = p.scores[t]!;
    if (v >= valueAt(t, 35, p.sex, 50)) return 35;
    for (let a = 35; a <= 90; a++) if (valueAt(t, a, p.sex, 50) <= v) return a;
    return 90;
  });
  return Math.round(ests.reduce((s, x) => s + x, 0) / ests.length);
}

/** Public display name: "Linda Rogers" -> "Linda R." (also handles "Linda R." already abbreviated). */
export function displayName(full: string) {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || "";
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
