/**
 * Longevity Combine norms and scoring.
 *
 * Every test converts a raw result to 0-100 points = the person's estimated
 * percentile against people of the same sex and age. Combine Score = sum of
 * points across tests completed (max 500), so it rewards doing more tests and
 * doing them well, and is age-adjusted by construction.
 *
 * Each norm row lists anchor percentiles (P5, P25, P50, P75, P95). Points are
 * linearly interpolated between anchors and clamped to 1..99.
 *
 * STATUS: DRAFT. Nicole/Katie sign-off required before HLTH. Rows marked
 * `estimate: true` are approximations, see notes and NORMS.md.
 */

export type Sex = "F" | "M";
export type TestId = "balance" | "grip" | "wallsit" | "pushups" | "floor";

export type Anchors = [p5: number, p25: number, p50: number, p75: number, p95: number];

export interface NormRow {
  minAge: number; // inclusive
  maxAge: number; // inclusive
  F: Anchors;
  M: Anchors;
  estimate?: boolean;
}

export interface TestDef {
  id: TestId;
  name: string;
  short: string;
  unit: string;
  cap?: number;
  step: number; // input increment
  higherIsBetter: true;
  protocol: string;
  source: string;
  rows: NormRow[];
}

const PCTS = [5, 25, 50, 75, 95];

/* ---------- Grip strength (kg, best hand) ----------
 * iGRIPS international norms (2025), ~2.4M adults, highest reading per hand.
 * 25th/75th are interpolated from P20/P30 and P70/P80 by the aggregator.
 * Under-20 uses the 20-24 row.
 */
const GRIP: NormRow[] = [
  { minAge: 0, maxAge: 24, M: [33.9, 41.9, 48.0, 54.5, 63.6], F: [19.7, 24.9, 28.6, 32.6, 39.1] },
  { minAge: 25, maxAge: 29, M: [35.5, 43.5, 49.3, 55.3, 64.0], F: [20.0, 25.4, 29.4, 33.6, 39.7] },
  { minAge: 30, maxAge: 34, M: [35.0, 43.6, 49.7, 55.9, 64.9], F: [19.6, 25.4, 29.7, 34.2, 40.4] },
  { minAge: 35, maxAge: 39, M: [33.8, 43.0, 49.5, 56.0, 65.3], F: [19.0, 25.1, 29.7, 34.3, 40.8] },
  { minAge: 40, maxAge: 44, M: [32.3, 42.0, 48.8, 55.5, 65.1], F: [18.3, 24.8, 29.4, 34.1, 40.8] },
  { minAge: 45, maxAge: 49, M: [30.6, 40.6, 47.6, 54.5, 64.4], F: [17.6, 24.1, 28.9, 33.6, 40.4] },
  { minAge: 50, maxAge: 54, M: [28.9, 39.0, 46.2, 53.2, 63.1], F: [16.9, 23.4, 28.2, 32.9, 39.7] },
  { minAge: 55, maxAge: 59, M: [27.2, 37.2, 44.4, 51.5, 61.4], F: [16.1, 22.6, 27.3, 31.9, 38.6] },
  { minAge: 60, maxAge: 64, M: [25.5, 35.2, 42.4, 49.5, 59.3], F: [15.2, 21.6, 26.2, 30.8, 37.4] },
  { minAge: 65, maxAge: 69, M: [23.7, 33.1, 40.1, 47.2, 56.8], F: [14.3, 20.6, 25.0, 29.4, 35.8] },
  { minAge: 70, maxAge: 74, M: [21.9, 30.9, 37.7, 44.7, 54.1], F: [13.2, 19.3, 23.6, 27.9, 34.1] },
  { minAge: 75, maxAge: 79, M: [20.0, 28.4, 35.1, 41.9, 51.1], F: [12.0, 17.9, 22.1, 26.2, 32.2] },
  { minAge: 80, maxAge: 84, M: [18.0, 25.9, 32.3, 39.0, 48.0], F: [10.7, 16.4, 20.4, 24.4, 30.2] },
  { minAge: 85, maxAge: 89, M: [15.9, 23.2, 29.4, 35.9, 44.6], F: [9.3, 14.8, 18.6, 22.4, 28.0] },
  { minAge: 90, maxAge: 120, M: [13.7, 20.4, 26.3, 32.7, 41.2], F: [7.8, 13.1, 16.7, 20.4, 25.7] },
];

/* ---------- Single-leg balance, eyes closed (seconds, best side, cap 60) ----------
 * Springer et al. 2007 (J Geriatr Phys Ther), n=549, eyes-closed best-of-3 means
 * by decade. Paper reports means only, and distributions are right-skewed, so
 * anchors are ESTIMATES: P5=0.15x, P25=0.45x, P50=0.8x, P75=1.4x, P95=3x the mean.
 * Springer capped at 45 s; we cap at 60.
 */
function balanceRow(minAge: number, maxAge: number, meanF: number, meanM: number): NormRow {
  const a = (m: number): Anchors => {
    const r = (x: number) => Math.round(x * 10) / 10;
    return [r(m * 0.15), r(m * 0.45), r(m * 0.8), r(m * 1.4), r(Math.min(60, m * 3))];
  };
  return { minAge, maxAge, F: a(meanF), M: a(meanM), estimate: true };
}
const BALANCE: NormRow[] = [
  balanceRow(0, 39, 13.1, 16.9),
  balanceRow(40, 49, 13.5, 12.0),
  balanceRow(50, 59, 7.9, 8.6),
  balanceRow(60, 69, 3.6, 5.1),
  balanceRow(70, 79, 3.7, 2.6),
  balanceRow(80, 120, 2.1, 1.8),
];

/* ---------- Push-ups (reps in 60 s; men full, women from knees) ----------
 * CSEP-PATH (Payne et al. 2000) adult norms, men full / women modified knee,
 * percentiles approximated from CSEP categories by the aggregator. CSEP is
 * to fatigue, not timed 60 s; close enough for a booth (few exceed 60 s).
 * 70+ is EXTRAPOLATED at 80% of the 60-69 row.
 */
const PUSHUPS: NormRow[] = [
  { minAge: 0, maxAge: 29, M: [8, 22, 25, 29, 40], F: [4, 15, 18, 21, 35] },
  { minAge: 30, maxAge: 39, M: [5, 17, 19, 22, 35], F: [3, 13, 16, 20, 31] },
  { minAge: 40, maxAge: 49, M: [4, 13, 15, 17, 30], F: [2, 11, 13, 15, 29] },
  { minAge: 50, maxAge: 59, M: [3, 10, 11, 13, 26], F: [0, 7, 9, 11, 27] },
  { minAge: 60, maxAge: 69, M: [2, 8, 9, 11, 22], F: [0, 5, 8, 12, 20] },
  { minAge: 70, maxAge: 120, M: [1, 6, 7, 9, 18], F: [0, 4, 6, 9, 16], estimate: true },
];

/* ---------- Floor rise / sitting-rising test (0-10) ----------
 * Araújo et al. 2020 (Eur J Prev Cardiol), 6,141 adults, sex- and age-reference
 * charts live in a supplement we could not access. Anchors below are ESTIMATES
 * consistent with the paper's text (score of 10 common under ~40; <8% of 55+
 * score 10) and Brito 2014 (scores of 8-10 vs 0-3 in ages 51-80).
 * Nicole: pull the supplement chart and replace.
 */
const FLOOR: NormRow[] = [
  { minAge: 0, maxAge: 39, M: [6.5, 8.5, 9.5, 10, 10], F: [6.5, 8.5, 9.5, 10, 10], estimate: true },
  { minAge: 40, maxAge: 49, M: [5.5, 7.5, 8.5, 9.5, 10], F: [5, 7, 8.5, 9.5, 10], estimate: true },
  { minAge: 50, maxAge: 59, M: [4.5, 6.5, 7.5, 8.5, 9.5], F: [4, 6, 7.5, 8.5, 9.5], estimate: true },
  { minAge: 60, maxAge: 69, M: [3, 5, 6.5, 7.5, 9], F: [2.5, 4.5, 6, 7.5, 9], estimate: true },
  { minAge: 70, maxAge: 79, M: [1.5, 3.5, 5, 6.5, 8], F: [1, 3, 4.5, 6, 8], estimate: true },
  { minAge: 80, maxAge: 120, M: [0.5, 2, 3.5, 5, 7], F: [0, 1.5, 3, 4.5, 6.5], estimate: true },
];

/* ---------- Wall sit (seconds, cap 120) ----------
 * No usable published norms for older adults. Groove-defined PROVISIONAL
 * reference curve, fixed for the whole show so scores and ranks never shift
 * as data comes in. Hitting 120 s = "2:00 Club".
 */
function wallRow(minAge: number, maxAge: number, p50: number): NormRow {
  const a: Anchors = [
    Math.round(p50 * 0.25), Math.round(p50 * 0.6), p50,
    Math.round(Math.min(120, p50 * 1.5)), Math.round(Math.min(120, p50 * 2.2)),
  ];
  return { minAge, maxAge, F: a, M: a, estimate: true };
}
const WALLSIT: NormRow[] = [
  wallRow(0, 39, 60), wallRow(40, 49, 50), wallRow(50, 59, 45),
  wallRow(60, 69, 35), wallRow(70, 79, 25), wallRow(80, 120, 18),
];

export const TESTS: Record<TestId, TestDef> = {
  balance: {
    id: "balance", name: "Single-leg balance, eyes closed", short: "Balance", unit: "sec", cap: 60, step: 0.1,
    higherIsBetter: true,
    protocol: "Arms crossed, eyes closed, best side. Clock stops when the raised foot touches down, arms uncross, eyes open, or 60 s.",
    source: "Springer et al. 2007, J Geriatr Phys Ther (estimated percentiles)", rows: BALANCE,
  },
  grip: {
    id: "grip", name: "Grip strength", short: "Grip", unit: "kg", step: 0.1, higherIsBetter: true,
    protocol: "Best of 2 per hand, score the stronger hand.",
    source: "iGRIPS international norms 2025 (J Sport Health Sci)", rows: GRIP,
  },
  wallsit: {
    id: "wallsit", name: "Wall sit", short: "Wall sit", unit: "sec", cap: 120, step: 1, higherIsBetter: true,
    protocol: "Back flat on the wall, thighs parallel. Clock stops when they stand or slide, or at 2:00.",
    source: "Groove provisional reference (no published norms)", rows: WALLSIT,
  },
  pushups: {
    id: "pushups", name: "Push-ups", short: "Push-ups", unit: "reps", cap: undefined, step: 1, higherIsBetter: true,
    protocol: "60 seconds. Men full, women from the knees. Chest to a fist, full lockout.",
    source: "CSEP-PATH adult norms (Payne et al. 2000)", rows: PUSHUPS,
  },
  floor: {
    id: "floor", name: "Floor rise", short: "Floor rise", unit: "/10", cap: 10, step: 0.5, higherIsBetter: true,
    protocol: "Sit to the floor and stand back up. Start at 10, minus 1 per hand, knee, forearm or side of leg used, minus 0.5 for a wobble.",
    source: "Araújo et al. 2020, Eur J Prev Cardiol (estimated percentiles)", rows: FLOOR,
  },
};

export const TEST_ORDER: TestId[] = ["grip", "balance", "wallsit", "pushups", "floor"];

export function normRow(test: TestId, age: number): NormRow {
  const rows = TESTS[test].rows;
  return rows.find((r) => age >= r.minAge && age <= r.maxAge) ?? rows[rows.length - 1];
}

/** Estimated percentile (1-99) for a raw result. */
export function percentile(test: TestId, age: number, sex: Sex, raw: number): number {
  const anchors = normRow(test, age)[sex];
  if (raw <= 0) return 1;
  // Extend below P5 to 0 at value 0, above P95 to 99.
  const xs = [0, ...anchors];
  const ys = [0, ...PCTS];
  let p: number;
  if (raw >= anchors[4]) {
    // Above P95: creep toward 99 over another 30% of headroom.
    const extra = anchors[4] * 0.3 || 1;
    p = 95 + Math.min(4, ((raw - anchors[4]) / extra) * 4);
  } else {
    p = 0;
    for (let i = 0; i < xs.length - 1; i++) {
      const [x0, x1, y0, y1] = [xs[i], xs[i + 1], ys[i], ys[i + 1]];
      if (raw >= x0 && raw <= x1) {
        p = x1 === x0 ? y1 : y0 + ((raw - x0) / (x1 - x0)) * (y1 - y0);
        break;
      }
    }
  }
  // Anchors that tie (e.g. floor-rise P75 = P95 = 10) resolve to the top value.
  if (anchors[3] === anchors[4] && raw >= anchors[4]) p = 95;
  return Math.max(1, Math.min(99, Math.round(p)));
}

export type Tier = "building" | "solid" | "strong" | "elite";
export const TIER_LABEL: Record<Tier, string> = {
  building: "Building", solid: "Solid", strong: "Strong", elite: "Elite",
};
export function tier(pct: number): Tier {
  if (pct >= 90) return "elite";
  if (pct >= 75) return "strong";
  if (pct >= 25) return "solid";
  return "building";
}

export function combineScore(points: Partial<Record<TestId, number>>): number {
  return Object.values(points).reduce<number>((s, v) => s + (v ?? 0), 0);
}

export const BRACKETS = [
  { id: "u40", label: "Under 40", min: 0, max: 39 },
  { id: "40s", label: "40s", min: 40, max: 49 },
  { id: "50s", label: "50s", min: 50, max: 59 },
  { id: "60s", label: "60s", min: 60, max: 69 },
  { id: "70p", label: "70+", min: 70, max: 120 },
] as const;
export type BracketId = (typeof BRACKETS)[number]["id"];
export function bracketOf(age: number): BracketId {
  return (BRACKETS.find((b) => age >= b.min && age <= b.max) ?? BRACKETS[0]).id;
}
