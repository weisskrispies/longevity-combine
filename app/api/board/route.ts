import { NextResponse } from "next/server";
import { db } from "@/lib/server";
import { CLUB_SEC, balanceLabel, BRACKETS, ORDER, TIER, TESTS, displayName, tierFor, bracketOf, combine, isFull, percentile, fmt, unitOf, type Sex, type TestId } from "@/lib/norms";

export const dynamic = "force-dynamic";
type Entry = { id: string; name: string; d: string; u: string };

/** Public leaderboard: names (opted in only) and display values. No ages or emails leave the server. */
export async function GET() {
  const { data, error } = await db().from("visitors").select("id, name, age, sex, opt_in, scores");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const all = (data ?? []).filter((v) => v.scores && Object.keys(v.scores).length);
  const pub = all.filter((v) => v.opt_in);
  const views: Record<string, { label: string; F: Entry[]; M: Entry[] }[]> = {};
  for (const view of ["overall", ...ORDER] as const) {
    views[view] = BRACKETS.map(([id, label]) => {
      const pick = (sex: Sex) => {
        let rows = pub.filter((v) => bracketOf(v.age) === id && v.sex === sex).map((v) => ({ v, p: { age: v.age, sex: v.sex as Sex, scores: v.scores } }));
        let ranked: { k: number; e: Entry }[];
        if (view === "overall") ranked = rows.filter((r) => isFull(r.p)).map((r) => ({ k: combine(r.p), e: { id: r.v.id, name: displayName(r.v.name), d: String(combine(r.p)), u: "" } }));
        else {
          const t = view as TestId;
          ranked = rows.filter((r) => r.p.scores[t] != null).map((r) => ({ k: percentile(t, r.p.age, r.p.sex, r.p.scores[t], !!r.p.scores.balance_eo)! + r.p.scores[t] / 1000, e: { id: r.v.id, name: displayName(r.v.name), d: fmt(t, r.p.scores[t]), u: unitOf(t) } }));
        }
        return ranked.sort((a, b) => b.k - a.k).slice(0, 2).map((x) => x.e);
      };
      return { label, F: pick("F"), M: pick("M") };
    });
  }
  const club = pub.filter((v) => (v.scores.squat ?? 0) >= CLUB_SEC).map((v) => displayName(v.name));
  // Searchable profiles: opted-in only, age group instead of exact age, no contact details.
  const groupRank = new Map<string, { rank: number; total: number }>();
  for (const sex of ["F", "M"] as Sex[]) for (const [bid] of BRACKETS) {
    const field = pub.filter((v) => v.sex === sex && bracketOf(v.age) === bid && isFull({ age: v.age, sex, scores: v.scores }))
      .map((v) => ({ id: v.id, s: combine({ age: v.age, sex, scores: v.scores }) })).sort((a, b) => b.s - a.s);
    field.forEach((f, i) => groupRank.set(f.id, { rank: i + 1, total: field.length }));
  }
  const people = pub.map((v) => {
    const p = { age: v.age, sex: v.sex as Sex, scores: v.scores }, br = BRACKETS.find((b) => b[0] === bracketOf(v.age))!;
    return {
      id: v.id, name: displayName(v.name), group: `${v.sex === "F" ? "Women" : "Men"}, ${br[1]}`,
      tests: ORDER.filter((t) => v.scores[t] != null).map((t) => { const tr = tierFor(t, p)!; return { t, name: t === "balance" ? `Balance, ${balanceLabel(v.scores)}` : TESTS[t].name, d: fmt(t, v.scores[t]), u: t === "grip" && v.scores.grip_lb ? `pct · ${v.scores.grip_lb} lb` : unitOf(t), tier: tr, tierLabel: TIER[tr] }; }),
      combine: isFull(p) ? combine(p) : null, standing: groupRank.get(v.id) ?? null, club: (v.scores.squat ?? 0) >= CLUB_SEC,
    };
  });
  return NextResponse.json({ count: all.length, views, club, people }, { headers: { "cache-control": "no-store" } });
}
