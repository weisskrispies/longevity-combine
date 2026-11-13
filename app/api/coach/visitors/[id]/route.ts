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
  if (b.scores || "floor_detail" in b) {
    const { data: cur, error: e0 } = await db().from("visitors").select("waiver_id").eq("id", id).single();
    if (e0 || !cur?.waiver_id) return NextResponse.json({ error: "No signed waiver for this visitor. Scores weren't saved." }, { status: 403 });
  }
  if (b.scores && typeof b.scores === "object") {
    const s: Record<string, number> = {};
    for (const t of ORDER) { const v = b.scores[t]; if (typeof v === "number" && isFinite(v)) s[t] = clampScore(t as TestId, v); }
    patch.scores = s;
  }
  if ("floor_detail" in b) patch.floor_detail = b.floor_detail ?? null;
  if (b.email !== undefined) {
    if (!emailOk(b.email)) return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
    patch.email = b.email.trim().toLowerCase(); patch.email_source = "coach"; patch.email_results = true;
  }
  const sel = async (cols: string) => db().from("visitors").update(patch).eq("id", id).select(cols).single<{ id: string; code: string; name: string; age: number; sex: string; scores: Record<string, number>; email: string | null; emailed_at?: string | null }>();
  let { data, error } = await sel("id, code, name, age, sex, scores, email, emailed_at");
  if (error && /emailed_at/.test(error.message)) ({ data, error } = await sel("id, code, name, age, sex, scores, email"));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (data && patch.email && data.email) await sendReportEmail({ ...data, email: data.email });
  return NextResponse.json({ visitor: data });
}
