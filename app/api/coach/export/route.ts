import { db, isCoach } from "@/lib/server";
import { ORDER, pointsOf, combine, isFull, type Sex } from "@/lib/norms";
import { ROLES, ASPIRE } from "@/lib/copy";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isCoach())) return new Response("Sign in first.", { status: 401 });
  const { data, error } = await db().from("visitors").select("*").order("created_at");
  if (error) return new Response(error.message, { status: 500 });
  const head = ["created_at", "name", "age", "sex", "email", "company", "title", "role", "follow_up_tag", "goal", "giveaway", "leaderboard", ...ORDER, ...ORDER.map((t) => `${t}_pct`), "combine_score", "code"];
  const q = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = (data ?? []).map((v) => {
    const p = { age: v.age, sex: v.sex as Sex, scores: v.scores ?? {} }, pts = pointsOf(p);
    const goal = v.aspire === "other" ? v.aspire_text : ASPIRE[v.aspire]?.label;
    return [v.created_at, v.name, v.age, v.sex, v.email, v.company, v.title, ROLES[v.role]?.[0] ?? "", ROLES[v.role]?.[1]?.toUpperCase() ?? "", goal, v.giveaway, v.opt_in,
      ...ORDER.map((t) => p.scores[t] ?? ""), ...ORDER.map((t) => pts[t] ?? ""), isFull(p) ? combine(p) : "", v.code].map(q).join(",");
  });
  return new Response([head.join(","), ...rows].join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="longevity-combine-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
