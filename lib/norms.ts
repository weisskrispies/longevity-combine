/**
 * Norms and scoring. Single source of truth for coach, report, board and the printed sheet.
 * Each test converts a raw result to an estimated percentile (1-99) against people of the
 * same age (and sex where the research splits by sex). Sources are listed in SOURCES below.
 * Calibrated Nov 13 to Nicole's benchmark sheet; still pending final clinical sign-off.
 */
export type Sex = "F" | "M";
export type TestId = "grip" | "balance" | "squat" | "pushups" | "floor";
/** Raw results keyed by test. balance_eo = 1 when balance was done eyes open (default is eyes closed). */
export type Scores = Partial<Record<TestId, number>> & { balance_eo?: number; grip_lb?: number };
type Anchors = number[]; // P5, P25, P50, P75, P95
interface Row { a: number; b: number; F: Anchors; M: Anchors }
type NormKey = TestId | "balance_eo";

const PCTS = [5, 25, 50, 75, 95], Z = [-1.645, -0.674, 0, 0.674, 1.645];
const r1 = (x: number) => Math.round(x * 10) / 10;
const same = (a: number, b: number, an: Anchors): Row => ({ a, b, F: an, M: an });

/** Grip: Nicole's sheet medians (US decade averages, Wang et al. JOSPT 2018), with the spread of the iGRIPS 2025 international percentiles. */
const GRIP_SPREAD = { M: [0.69, 0.87, 1, 1.12, 1.30], F: [0.68, 0.86, 1, 1.15, 1.37] };
const gripRow = (a: number, b: number, m: number, f: number): Row => ({ a, b, M: GRIP_SPREAD.M.map((k) => r1(m * k)), F: GRIP_SPREAD.F.map((k) => r1(f * k)) });

/** Balance: Springer et al. 2007, best of 3, stopped at 45 s. Sexes pooled (no significant difference). */
const BAL_CAP = 45;
const balAnchors = (mean: number, sd: number): Anchors => {
  if (mean - 1.645 * sd > 0) return Z.map((z) => r1(Math.min(BAL_CAP, mean + z * sd))); // near-normal, ceiling at 45
  const s2 = Math.log(1 + (sd * sd) / (mean * mean)), s = Math.sqrt(s2), mu = Math.log(mean) - s2 / 2; // right-skewed: lognormal
  return Z.map((z) => r1(Math.min(BAL_CAP, Math.exp(mu + z * s))));
};
const SPRINGER: [number, number, number, number, number, number][] = [ // a, b, eyes open mean, sd, eyes closed mean, sd
  [0, 39, 44.7, 3.1, 15.2, 13.3], [40, 49, 41.9, 9.9, 12.7, 12.9], [50, 59, 41.2, 10.2, 8.3, 8.4],
  [60, 69, 32.1, 16.2, 4.4, 5.1], [70, 79, 21.5, 17.3, 3.1, 4.5], [80, 120, 9.4, 12.8, 1.9, 1.0],
];

/** Push-ups: ACSM categories from Nicole's sheet. "Needs work" at or below nw; "Good" from lo to hi. Untimed, to fatigue. */
const puAnchors = (nw: number, lo: number, hi: number): Anchors => [Math.max(0, Math.round(nw * 0.4)), nw + 1, Math.round((lo + hi) / 2), Math.round(hi + (hi - lo) / 2 + 1), Math.round(hi * 1.6 + 2)];
const PUSH: [number, number, [number, number, number], [number, number, number]][] = [ // men [nw, lo, hi], women [nw, lo, hi]
  [0, 29, [16, 22, 28], [9, 15, 20]], [30, 39, [11, 17, 21], [7, 13, 19]], [40, 49, [9, 13, 16], [4, 11, 14]],
  [50, 59, [6, 10, 12], [1, 7, 10]], [60, 69, [4, 8, 10], [1, 5, 11]],
];

/**
 * Floor rise (sitting-rising test, 0-10). Age curve built to match the published facts:
 * a 10 is most common in men 16-25 and women 16-40, and under 8% of adults over 55 score 10
 * (Araujo 2020, 6,141 adults); about 70% of adults 60 and under score 8-10, and over half
 * of 76-80 year-olds score 0-3 (Brito 2012). Tiers use the mortality risk bands instead.
 */
const FLOOR: [number, number, Anchors, Anchors][] = [ // men, women
  [0, 25, [7, 9, 10, 10, 10], [7, 9, 10, 10, 10]], [26, 40, [6.5, 8.5, 9.5, 10, 10], [7, 9, 10, 10, 10]],
  [41, 55, [5, 7.5, 8.5, 9.5, 10], [4.5, 7, 8.5, 9.5, 10]], [56, 60, [4, 7, 8, 9, 9.5], [3.5, 6.5, 7.5, 8.5, 9.5]],
  [61, 70, [2.5, 5, 6.5, 8, 9.5], [2, 4.5, 6, 7.5, 9]], [71, 75, [1, 3.5, 5, 6.5, 8.5], [0.5, 3, 4.5, 6, 8]],
  [76, 120, [0, 1.5, 3, 5, 7.5], [0, 1, 2.5, 4.5, 7]],
];

/** Squat hold: no published norms exist. Groove estimate, capped at 60 s. Read as directional. */
const SQUAT_CAP = 60;
const squatRow = (a: number, b: number, med: number): Row => same(a, b, [Math.round(med * 0.3), Math.round(med * 0.65), med, Math.min(SQUAT_CAP, Math.round(med * 1.35)), SQUAT_CAP]);

const NORMS: Record<NormKey, Row[]> = {
  grip: [gripRow(0, 29, 47, 29), gripRow(30, 39, 48, 29), gripRow(40, 49, 45, 28), gripRow(50, 59, 41, 26), gripRow(60, 69, 36, 23), gripRow(70, 79, 31, 19), gripRow(80, 120, 25, 16)],
  balance: SPRINGER.map(([a, b, , , m, sd]) => same(a, b, balAnchors(m, sd))),
  balance_eo: SPRINGER.map(([a, b, m, sd]) => same(a, b, balAnchors(m, sd))),
  pushups: [
    ...PUSH.map(([a, b, M, F]) => ({ a, b, M: puAnchors(...M), F: puAnchors(...F) })),
    { a: 70, b: 120, M: [1, 3, 6, 9, 14], F: [0, 2, 5, 9, 14] }, // no validated 70+ norms; extended from the 60s
  ],
  floor: FLOOR.map(([a, b, M, F]) => ({ a, b, M, F })),
  squat: [squatRow(0, 39, 40), squatRow(40, 49, 35), squatRow(50, 59, 30), squatRow(60, 69, 22), squatRow(70, 79, 15), squatRow(80, 120, 10)],
};

/** Low-grip flag at any age (EWGSOP2, Cruz-Jentoft 2019). */
export const LOW_GRIP: Record<Sex, number> = { M: 27, F: 16 };

export const TESTS: Record<TestId, { name: string; short: string; unit: string; step: number; max: number; mode?: "decimal" | "numeric"; hint?: string }> = {
  grip: { name: "Grip strength", short: "Grip", unit: "pct", step: 1, max: 99, mode: "numeric", hint: "From Able Assess: the percentile (already adjusted for age and sex) and pounds." },
  balance: { name: "One-leg balance", short: "Balance", unit: "sec", step: 0.5, max: BAL_CAP, mode: "decimal", hint: "Arms crossed, best of 3. Stop at 45." },
  squat: { name: "Squat hold", short: "Squat hold", unit: "sec", step: 1, max: SQUAT_CAP, mode: "numeric", hint: "Thighs parallel, no wall. Stop at 60 (1:00 Club)." },
  pushups: { name: "Push-ups", short: "Push-ups", unit: "reps", step: 1, max: 99, mode: "numeric", hint: "As many as they can with good form. Men full, women from knees." },
  floor: { name: "Floor rise", short: "Floor rise", unit: "/10", step: 0.5, max: 10 },
};
export const ORDER: TestId[] = ["grip", "balance", "pushups", "squat", "floor"]; // the order people usually try them
export const CLUB_SEC = SQUAT_CAP;
export const balanceLabel = (s: Scores) => (s.balance_eo ? "eyes open" : "eyes closed");

/** Published sources, shown in the report and on the printed sheet. */
export const SOURCES: Record<TestId, { cite: string; note: string }> = {
  grip: { cite: "Able Assess percentile, adjusted for age and sex. Reference kg on the printed sheet: Wang et al., JOSPT 2018 (US adults 18-85); low-grip cutoffs from EWGSOP2 (Cruz-Jentoft 2019)", note: "Measured on the Able Assess dynamometer." },
  balance: { cite: "Springer et al., J Geriatr Phys Ther 2007 (549 adults 18-99)", note: "Best of 3, stopped at 45 seconds. Men and women did not differ, so both use the same norms." },
  squat: { cite: "No validated age norms exist for a squat or wall-sit hold", note: "Groove estimate. Read it as directional." },
  pushups: { cite: "ACSM Guidelines for Exercise Testing and Prescription; CSEP", note: "Untimed, to fatigue. No validated norms past 70, so 70+ is extended from the 60s." },
  floor: { cite: "Brito et al., Eur J Prev Cardiol 2012 (2,002 adults 51-80); Araujo et al., Eur J Prev Cardiol 2020 (6,141 adults) and 2025 (4,282 adults 46-75, 12-year follow-up)", note: "Tiers follow the mortality risk bands. The age comparison is modeled from published findings." },
};

export const BRACKETS = [["u40", "Under 40", 0, 39], ["40s", "40s", 40, 49], ["50s", "50s", 50, 59], ["60s", "60s", 60, 69], ["70p", "70+", 70, 120]] as const;
export const bracketOf = (age: number) => (BRACKETS.find((b) => age >= b[2] && age <= b[3]) ?? BRACKETS[0])[0];

const anchorsFor = (t: NormKey, age: number, sex: Sex) => {
  const rows = NORMS[t];
  return (rows.find((r) => age >= r.a && age <= r.b) ?? rows[rows.length - 1])[sex];
};

const keyOf = (t: TestId, eo?: boolean): NormKey => (t === "balance" && eo ? "balance_eo" : t);
/** Grip is entered as Able Assess's age- and sex-adjusted percentile, so it passes straight through. */
export function percentile(t: TestId, age: number, sex: Sex, raw: number | null | undefined, eo?: boolean): number | null {
  if (raw == null || isNaN(raw)) return null;
  if (t === "grip") return Math.max(1, Math.min(99, Math.round(raw)));
  return pctFromNorms(t, age, sex, raw, eo);
}
function pctFromNorms(t: TestId, age: number, sex: Sex, raw: number, eo?: boolean): number {
  if (raw <= 0) return 1;
  const an = anchorsFor(keyOf(t, eo), age, sex), xs = [0, ...an], ys = [0, ...PCTS];
  let p = 0;
  if (raw >= an[4]) {
    const first = an.findIndex((x) => x >= an[4]);
    if (first < 4) p = (PCTS[first] + 100) / 2; // many people hit the cap: rank ties at the middle of the tied group
    else p = 95 + Math.min(4, ((raw - an[4]) / (an[4] * 0.3 || 1)) * 4);
  } else {
    for (let i = 0; i < xs.length - 1; i++) {
      if (raw >= xs[i] && raw <= xs[i + 1]) { p = xs[i + 1] === xs[i] ? ys[i + 1] : ys[i] + ((raw - xs[i]) / (xs[i + 1] - xs[i])) * (ys[i + 1] - ys[i]); break; }
    }
  }
  return Math.max(1, Math.min(99, Math.round(p)));
}

/** Raw value at a given percentile (used for typical, top 10%, and projections). */
export function valueAt(t: TestId, age: number, sex: Sex, p: number, eo?: boolean): number {
  if (t === "grip") return Math.max(1, Math.min(99, Math.round(p)));
  return valFromNorms(t, age, sex, p, eo);
}
/** Grip in kg at a percentile, from our reference norms (used for the sheet and movement age). */
export const gripKgAt = (age: number, sex: Sex, p: number) => valFromNorms("grip", age, sex, p);
function valFromNorms(t: TestId, age: number, sex: Sex, p: number, eo?: boolean): number {
  const an = anchorsFor(keyOf(t, eo), age, sex), xs = [0, ...an], ys = [0, ...PCTS];
  let v = an[4];
  if (p > 95) v = an[4] * (1 + ((p - 95) / 4) * 0.3);
  else for (let i = 0; i < ys.length - 1; i++) if (p >= ys[i] && p <= ys[i + 1]) { v = xs[i] + ((p - ys[i]) / (ys[i + 1] - ys[i])) * (xs[i + 1] - xs[i]); break; }
  const s = t === "grip" ? 0.5 : TESTS[t].step, mx = t === "grip" ? 90 : TESTS[t].max;
  return Math.max(0, Math.min(mx, Math.round(v / s) * s));
}

export type Tier = "building" | "solid" | "strong" | "elite";
export const TIER: Record<Tier, string> = { building: "Building", solid: "Solid", strong: "Strong", elite: "Elite" };
export const tierOf = (p: number): Tier => (p >= 90 ? "elite" : p >= 75 ? "strong" : p >= 25 ? "solid" : "building");

export interface Person { age: number; sex: Sex; scores: Scores }
export function pointsOf(p: Person): Partial<Record<TestId, number>> {
  const o: Partial<Record<TestId, number>> = {};
  ORDER.forEach((t) => { const v = p.scores[t]; if (v != null) o[t] = percentile(t, p.age, p.sex, v, !!p.scores.balance_eo)!; });
  return o;
}
export const combine = (p: Person) => Object.values(pointsOf(p)).reduce((a, b) => a + (b ?? 0), 0);
export const isFull = (p: Person) => ORDER.every((t) => p.scores[t] != null);
const ord = (n: number) => { const r = Math.round(n), k = r % 100; return `${r}${k >= 11 && k <= 13 ? "th" : ["th", "st", "nd", "rd"][r % 10] ?? "th"}`; };
export const fmt = (t: TestId, v: number | null | undefined) =>
  v == null ? "" : t === "grip" ? ord(v) : t === "squat" ? `0:${String(Math.round(v)).padStart(2, "0")}` : Number.isInteger(v) ? String(v) : v.toFixed(1);
export const unitOf = (t: TestId) => (t === "squat" ? "" : TESTS[t].unit === "/10" ? "of 10" : TESTS[t].unit);
export function clampScore(t: TestId, v: number) {
  if (t === "grip") return Math.max(1, Math.min(99, Math.round(v))); const T = TESTS[t]; return Math.max(0, Math.min(T.max, Math.round(v / T.step) * T.step)); }

/** Age at which their results match the median, averaged across tests (estimate). */
export function movementAge(p: Person) {
  const ests = ORDER.filter((t) => p.scores[t] != null).map((t) => {
    const eo = !!p.scores.balance_eo;
    const v = t === "grip" ? gripKgAt(p.age, p.sex, p.scores.grip!) : p.scores[t]!; // percentile -> kg at their age
    if (v >= valFromNorms(t, 35, p.sex, 50, eo)) return 35;
    for (let a = 35; a <= 90; a++) if (valFromNorms(t, a, p.sex, 50, eo) <= v) return a;
    return 90;
  });
  return Math.round(ests.reduce((s, x) => s + x, 0) / ests.length);
}

/** Public display name: first name only, as the release allows ("Linda Rogers" -> "Linda"). */
export function displayName(full: string) {
  return full.trim().split(/\s+/)[0] || "";
}

const NOUNS: Record<TestId, string> = { grip: "grip strength", balance: "balance", squat: "leg strength", pushups: "upper-body strength", floor: "floor rise" };
/** One-line insight used in the report hero and the results email. */
export function headlineFor(p: Person) {
  const pts = pointsOf(p) as Record<TestId, number>, done = ORDER.filter((t) => p.scores[t] != null);
  if (!done.length) return "Your results are ready.";
  const who = p.sex === "F" ? "women" : "men";
  const sorted = done.slice().sort((a, c) => pts[c] - pts[a]), best = sorted[0], low = sorted[sorted.length - 1];
  const avg = Math.round(done.reduce((a, t) => a + pts[t], 0) / done.length);
  const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
  if (done.length > 1 && pts[best] - pts[low] >= 15) return `Your ${NOUNS[best]} is ahead of your age. ${cap(NOUNS[low])} is where to focus.`;
  if (avg >= 65) return `You're ahead of most ${who} your age across the board.`;
  if (avg >= 40) return "You're right around typical for your age, with clear room to build.";
  return "You have real room to build, and these measures respond quickly.";
}

/**
 * Tier for display. Floor rise uses the mortality risk bands (Brito 2012: 8-10 lowest risk,
 * 6-7.5 about 1.8x, 3.5-5.5 about 3.8x, 0-3 about 6.5x; Araujo 2025: a perfect 10 lowest of all).
 */
export const FLOOR_BANDS = [
  { tier: "elite" as const, range: "10", risk: "Lowest risk in the research" },
  { tier: "strong" as const, range: "8 to 9.5", risk: "Low risk" },
  { tier: "solid" as const, range: "6 to 7.5", risk: "About 1.8x the risk of 8+" },
  { tier: "building" as const, range: "Under 6", risk: "About 4 to 6x the risk of 8+" },
];
export const floorTier = (score: number): Tier => (score >= 10 ? "elite" : score >= 8 ? "strong" : score >= 6 ? "solid" : "building");
export function tierFor(t: TestId, p: Person): Tier | null {
  const v = p.scores[t]; if (v == null) return null;
  return t === "floor" ? floorTier(v) : tierOf(percentile(t, p.age, p.sex, v, !!p.scores.balance_eo)!);
}
/** 0-100 position on the four-step ladder (equal-width tiers). */
export function ladderPos(t: TestId, p: Person) {
  const v = p.scores[t]!;
  if (t === "floor") { const tr = floorTier(v); return tr === "elite" ? 87.5 : tr === "strong" ? 50 + ((v - 8) / 2) * 25 : tr === "solid" ? 25 + ((v - 6) / 2) * 25 : (v / 6) * 25; }
  const pc = percentile(t, p.age, p.sex, v, !!p.scores.balance_eo)!, B = [0, 25, 75, 90, 100], i = ["building", "solid", "strong", "elite"].indexOf(tierOf(pc));
  return (i + (pc - B[i]) / (B[i + 1] - B[i])) * 25;
}

/** Age rows for a test, for the printed benchmark sheet. eo = balance with eyes open. */
export const ageRows = (t: TestId, eo?: boolean) => NORMS[keyOf(t, eo)].map((r) => [r.a, r.b] as const);
