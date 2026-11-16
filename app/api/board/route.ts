import { NextResponse } from "next/server";
import { db } from "@/lib/server";
import { SHOW_DAYS, defaultDay, ptDay } from "@/lib/days";
import { CLUB_SEC, balanceLabel, BRACKETS, ORDER, TIER, TESTS, displayName, tierFor, bracketOf, combine, hasAny, isFull, testsDone, percentile, fmt, unitOf, type Sex, type TestId } from "@/lib/norms";

export const dynamic = "force-dynamic";
type Entry = { id: string; name: string; d: string; u: string; g?: string };

/** Public leaderboard: names (opted in only) and display values. No ages or emails leave the server. */
export async function GET(req: Request) {
  const asked = new URL(req.url).searchParams.get("day") || "";
  const day = asked === "all" || /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : defaultDay();
  const { data, error } = await db().from("visitors").select("id, name, age, sex, opt_in, scores, created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const everyone = (data ?? []).filter((v) => v.scores && Object.keys(v.scores).length).map((v) => ({ ...v, day: ptDay(v.created_at) }));
  const inDay = (v: { day: string }) => day === "all" || v.day === day;
  const all = everyone.filter(inDay);
  const pub = all.filter((v) => v.opt_in);
  const views: Record<string, { label: string; F: Entry[]; M: Entry[] }[]> = {};
  for (const view of ["overall", ...ORDER] as const) {
    views[view] = BRACKETS.map(([id, label]) => {
      const pick = (sex: Sex) => {
        let rows = pub.filter((v) => bracketOf(v.age) === id && v.sex === sex).map((v) => ({ v, p: { age: v.age, sex: v.sex as Sex, scores: v.scores } }));
        let ranked: { k: number; e: Entry }[];
        if (view === "overall") ranked = rows.filter((r) => hasAny(r.p)).map((r) => ({ k: combine(r.p) + testsDone(r.p) / 10, e: { id: r.v.id, name: displayName(r.v.name), d: String(combine(r.p)), u: isFull(r.p) ? "" : `${testsDone(r.p)} of 5` } }));
        else {
          const t = view as TestId;
          ranked = rows.filter((r) => r.p.scores[t] != null).map((r) => ({ k: percentile(t, r.p.age, r.p.sex, r.p.scores[t], !!r.p.scores.balance_eo)! + r.p.scores[t] / 1000, e: { id: r.v.id, name: displayName(r.v.name), d: fmt(t, r.p.scores[t]), u: unitOf(t) } }));
        }
        return ranked.sort((a, b) => b.k - a.k).slice(0, 2).map((x) => x.e);
      };
      return { label, F: pick("F"), M: pick("M") };
    });
  }
  // Combine Score: one list for everyone, ranked by points. Age group and sex shown as a label on each row.
  const top = pub.map((v) => ({ v, p: { age: v.age, sex: v.sex as Sex, scores: v.scores } })).filter((r) => hasAny(r.p))
    .map((r) => ({ k: combine(r.p) + testsDone(r.p) / 10, e: { id: r.v.id, name: displayName(r.v.name), d: String(combine(r.p)), u: isFull(r.p) ? "" : `${testsDone(r.p)} of 5`, g: `${r.v.sex === "F" ? "Women" : "Men"}, ${BRACKETS.find((b) => b[0] === bracketOf(r.v.age))![1]}` } }))
    .sort((a, b) => b.k - a.k).slice(0, 10).map((x) => x.e);
  const club = pub.filter((v) => (v.scores.squat ?? 0) >= CLUB_SEC).map((v) => displayName(v.name));
  // Searchable profiles across every day: opted-in only, age group instead of exact age, no contact details.
  // Each person's standing is within the day they tested, matching their report.
  const pubAll = everyone.filter((v) => v.opt_in);
  const groupRank = new Map<string, { rank: number; total: number }>();
  for (const d of [...new Set(pubAll.map((v) => v.day))]) for (const sex of ["F", "M"] as Sex[]) for (const [bid] of BRACKETS) {
    const field = pubAll.filter((v) => v.day === d && v.sex === sex && bracketOf(v.age) === bid && hasAny({ age: v.age, sex, scores: v.scores }))
      .map((v) => ({ id: v.id, s: combine({ age: v.age, sex, scores: v.scores }) })).sort((a, b) => b.s - a.s);
    field.forEach((f, i) => groupRank.set(f.id, { rank: i + 1, total: field.length }));
  }
  const people = pubAll.map((v) => {
    const p = { age: v.age, sex: v.sex as Sex, scores: v.scores }, br = BRACKETS.find((b) => b[0] === bracketOf(v.age))!;
    return {
      id: v.id, name: displayName(v.name), group: `${v.sex === "F" ? "Women" : "Men"}, ${br[1]}`,
      tests: ORDER.filter((t) => v.scores[t] != null).map((t) => { const tr = tierFor(t, p)!; return { t, name: t === "balance" ? `Balance, ${balanceLabel(v.scores)}` : TESTS[t].name, d: fmt(t, v.scores[t]), u: t === "grip" && v.scores.grip_lb ? `pct · ${v.scores.grip_lb} lb` : unitOf(t), tier: tr, tierLabel: TIER[tr], pts: percentile(t, v.age, v.sex as Sex, v.scores[t], !!v.scores.balance_eo) }; }),
      combine: hasAny(p) ? combine(p) : null, done: testsDone(p), standing: groupRank.get(v.id) ?? null, day: v.day, club: (v.scores.squat ?? 0) >= CLUB_SEC,
    };
  });
  return NextResponse.json({ day, today: ptDay(), days: SHOW_DAYS, count: all.length, views, top, club, people, build: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" }, { headers: { "cache-control": "no-store" } });
}
