import { NextResponse } from "next/server";
import { db } from "@/lib/server";
import { BRACKETS, ORDER, displayName, bracketOf, combine, isFull, percentile, fmt, unitOf, type Sex, type TestId } from "@/lib/norms";

export const dynamic = "force-dynamic";
type Entry = { name: string; d: string; u: string };

/** Public leaderboard: names (opted in only) and display values. No ages or emails leave the server. */
export async function GET() {
  const { data, error } = await db().from("visitors").select("name, age, sex, opt_in, scores");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const all = (data ?? []).filter((v) => v.scores && Object.keys(v.scores).length);
  const pub = all.filter((v) => v.opt_in);
  const views: Record<string, { label: string; F: Entry[]; M: Entry[] }[]> = {};
  for (const view of ["overall", ...ORDER] as const) {
    views[view] = BRACKETS.map(([id, label]) => {
      const pick = (sex: Sex) => {
        let rows = pub.filter((v) => bracketOf(v.age) === id && v.sex === sex).map((v) => ({ v, p: { age: v.age, sex: v.sex as Sex, scores: v.scores } }));
        let ranked: { k: number; e: Entry }[];
        if (view === "overall") ranked = rows.filter((r) => isFull(r.p)).map((r) => ({ k: combine(r.p), e: { name: displayName(r.v.name), d: String(combine(r.p)), u: "" } }));
        else {
          const t = view as TestId;
          ranked = rows.filter((r) => r.p.scores[t] != null).map((r) => ({ k: percentile(t, r.p.age, r.p.sex, r.p.scores[t])! + r.p.scores[t] / 1000, e: { name: displayName(r.v.name), d: fmt(t, r.p.scores[t]), u: unitOf(t) } }));
        }
        return ranked.sort((a, b) => b.k - a.k).slice(0, 2).map((x) => x.e);
      };
      return { label, F: pick("F"), M: pick("M") };
    });
  }
  const club = pub.filter((v) => (v.scores.wallsit ?? 0) >= 120).map((v) => displayName(v.name));
  return NextResponse.json({ count: all.length, views, club }, { headers: { "cache-control": "no-store" } });
}
