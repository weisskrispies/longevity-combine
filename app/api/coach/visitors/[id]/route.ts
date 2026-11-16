import { NextResponse } from "next/server";
import { db, isCoach, emailOk } from "@/lib/server";
import { ORDER, clampScore, type TestId } from "@/lib/norms";
import { sendReportEmail } from "@/lib/email";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isCoach())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  const patch: Record<string, unknown> = {};

  if (b.scores && typeof b.scores === "object") {
    const s: Record<string, number> = {};
    for (const t of ORDER) { const v = b.scores[t]; if (typeof v === "number" && isFinite(v)) s[t] = clampScore(t as TestId, v); }
    if (b.scores.balance_eo) s.balance_eo = 1; // eyes open
    const lb = b.scores.grip_lb; if (typeof lb === "number" && isFinite(lb) && lb > 0) s.grip_lb = Math.min(250, Math.round(lb * 2) / 2);
    patch.scores = s;
  }
  if (typeof b.name === "string") { const n = b.name.trim().replace(/\s+/g, " ").slice(0, 60); if (!n) return NextResponse.json({ error: "Name can't be empty." }, { status: 400 }); patch.name = n; }
  if ("floor_detail" in b) patch.floor_detail = b.floor_detail ?? null;
  if (typeof b.opt_in === "boolean") patch.opt_in = b.opt_in;
  if (typeof b.giveaway === "boolean") patch.giveaway = b.giveaway;
  if (typeof b.email_results === "boolean") patch.email_results = b.email_results;
  if (b.email !== undefined) {
    if (!emailOk(b.email)) return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
    patch.email = b.email.trim().toLowerCase(); patch.email_source = "coach";
  }
  const sel = async (cols: string) => db().from("visitors").update(patch).eq("id", id).select(cols).single<{ id: string; code: string; name: string; age: number; sex: string; scores: Record<string, number>; email: string | null; emailed_at?: string | null }>();
  let { data, error } = await sel("id, code, name, age, sex, scores, email, emailed_at");
  if (error && /emailed_at|email_results/.test(error.message)) { delete patch.email_results; ({ data, error } = await sel("id, code, name, age, sex, scores, email")); }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (data && patch.email && data.email && b.send_results !== false) await sendReportEmail({ ...data, email: data.email });
  // Opt-ins given at the end also go on their signed waiver, so the consent record stays in one place.
  const consent = { ...(b.opt_in === true ? { consent_leaderboard: true } : {}), ...(b.giveaway === true ? { consent_giveaway: true } : {}), ...(b.email_results === true ? { consent_email: true } : {}) };
  if (Object.keys(consent).length) {
    const w = await db().from("visitors").select("waiver_id").eq("id", id).single();
    if (!w.error && w.data?.waiver_id) await db().from("waivers").update(consent).eq("id", w.data.waiver_id);
  }
  return NextResponse.json({ visitor: data });
}
