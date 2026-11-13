import { db, isCoach } from "@/lib/server";
import { ORDER, pointsOf, combine, isFull, type Sex } from "@/lib/norms";
import { ROLES, ASPIRE } from "@/lib/copy";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isCoach())) return new Response("Sign in first.", { status: 401 });
  const { data, error } = await db().from("visitors").select("*").order("created_at");
  if (error) return new Response(error.message, { status: 500 });
  const { data: ws } = await db().from("waivers").select("*");
  const W = new Map((ws ?? []).map((w) => [w.id, w]));
  const yn = (b: unknown) => (b == null ? "" : b ? "yes" : "no");
  const head = ["created_at", "name", "age", "sex", "email", "company", "title", "role", "follow_up_tag", "goal", "giveaway", "leaderboard", "wants_contact", "emailed", ...ORDER, ...ORDER.map((t) => `${t}_pct`), "combine_score", "code",
    "waiver_signed", "waiver_signed_name", "waiver_signed_at", "waiver_version", "waiver_device", "consent_leaderboard", "consent_media", "consent_email_results"];
  const q = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = (data ?? []).map((v) => {
    const p = { age: v.age, sex: v.sex as Sex, scores: v.scores ?? {} }, pts = pointsOf(p);
    const goal = String(v.aspire ?? "").split(",").filter(Boolean).map((k) => (k === "other" ? v.aspire_text : ASPIRE[k]?.label)).filter(Boolean).join("; ");
    return [v.created_at, v.name, v.age, v.sex, v.email, v.company, v.title, ROLES[v.role]?.[0] ?? "", ROLES[v.role]?.[1]?.toUpperCase() ?? "", goal, v.giveaway, v.opt_in, v.interest ?? "", v.emailed_at ? "yes" : "",
      ...ORDER.map((t) => p.scores[t] ?? ""), ...ORDER.map((t) => pts[t] ?? ""), isFull(p) ? combine(p) : "", v.code,
      ...((w) => w ? ["yes", w.signed_name, w.signed_at, w.version, w.device, yn(w.consent_leaderboard), yn(w.consent_media), yn(w.consent_email)] : ["no", "", "", "", "", "", "", ""])(v.waiver_id ? W.get(v.waiver_id) : null)].map(q).join(",");
  });
  return new Response([head.join(","), ...rows].join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="longevity-combine-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
