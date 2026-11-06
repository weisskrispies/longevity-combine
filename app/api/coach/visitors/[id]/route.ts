import { NextResponse } from "next/server";
import { db, isCoach, emailOk } from "@/lib/server";
import { ORDER, clampScore, type TestId } from "@/lib/norms";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isCoach())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (b.scores && typeof b.scores === "object") {
    const s: Record<string, number> = {};
    for (const t of ORDER) { const v = b.scores[t]; if (typeof v === "number" && isFinite(v)) s[t] = clampScore(t as TestId, v); }
    patch.scores = s;
  }
  if ("floor_detail" in b) patch.floor_detail = b.floor_detail ?? null;
  if (b.email !== undefined) {
    if (!emailOk(b.email)) return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
    patch.email = b.email.trim().toLowerCase(); patch.email_source = "coach";
  }
  const { data, error } = await db().from("visitors").update(patch).eq("id", id).select("id, code, scores, email").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ visitor: data });
}
