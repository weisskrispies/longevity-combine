import { NextResponse } from "next/server";
import { db, emailOk } from "@/lib/server";
import { sendReportEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
const COLS = "id, code, name, age, sex, aspire, aspire_text, role, company, scores, email, emailed_at, interest";

type Row = { id: string; code: string; name: string; age: number; sex: string; aspire: string | null; aspire_text: string | null; role: string | null; company: string | null; scores: Record<string, number>; email: string | null; emailed_at?: string | null; interest?: string | null };
async function load(code: string): Promise<Row | null> {
  const c = code.toUpperCase();
  const r = await db().from("visitors").select(COLS).eq("code", c).maybeSingle();
  if (!r.error) return r.data as Row | null;
  // Columns from schema v2 not added yet: fall back so reports still work.
  const r2 = await db().from("visitors").select("id, code, name, age, sex, aspire, aspire_text, role, company, scores, email").eq("code", c).maybeSingle();
  return r2.data as Row | null;
}
// Never send the email itself back; only whether the report is unlocked.
const shape = (v: Row) => ({
  first: v.name.split(" ")[0], name: v.name, age: v.age, sex: v.sex, aspire: v.aspire, aspire_text: v.aspire_text,
  role: v.role, company: v.company, interest: v.interest, unlocked: !!v.email, scores: v.email ? v.scores : null,
});

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const v = await load((await ctx.params).code);
  if (!v) return NextResponse.json({ error: "We couldn't find that report." }, { status: 404 });
  return NextResponse.json(shape(v));
}

/** Unlock with email (body.email), or record interest (body.interest). */
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = (await ctx.params).code.toUpperCase();
  const b = await req.json().catch(() => null);
  const v0 = await load(code);
  if (!v0) return NextResponse.json({ error: "We couldn't find that report." }, { status: 404 });

  if (b && typeof b.interest === "string") {
    if (!v0.email) return NextResponse.json({ error: "Unlock your report first." }, { status: 400 });
    const interest = ["partner", "refer", "investor", "press"].includes(b.interest) ? b.interest : "partner";
    const { error } = await db().from("visitors").update({ interest }).eq("id", v0.id);
    if (error) return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 });
    return NextResponse.json(shape({ ...v0, interest }));
  }

  if (!b || !emailOk(b.email)) return NextResponse.json({ error: "Enter a valid email to see your results." }, { status: 400 });
  const email = b.email.trim().toLowerCase();
  const { error } = await db().from("visitors").update({
    email, email_source: v0.email ? undefined : "report",
    company: typeof b.company === "string" && b.company.trim() ? b.company.trim().slice(0, 120) : v0.company,
    title: typeof b.title === "string" && b.title.trim() ? b.title.trim().slice(0, 120) : undefined,
  }).eq("id", v0.id);
  if (error) return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 });
  await sendReportEmail({ ...v0, email });
  const v = await load(code);
  return v ? NextResponse.json(shape(v)) : NextResponse.json({ error: "We couldn't find that report." }, { status: 404 });
}
