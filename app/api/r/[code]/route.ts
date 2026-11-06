import { NextResponse } from "next/server";
import { db, emailOk } from "@/lib/server";

export const dynamic = "force-dynamic";
const PUBLIC = "name, age, sex, aspire, aspire_text, scores, email";

async function load(code: string) {
  const { data } = await db().from("visitors").select(PUBLIC).eq("code", code.toUpperCase()).maybeSingle();
  return data;
}
// Never send the email itself back; only whether the report is unlocked.
const shape = (v: NonNullable<Awaited<ReturnType<typeof load>>>) => ({
  first: v.name.split(" ")[0], name: v.name, age: v.age, sex: v.sex, aspire: v.aspire, aspire_text: v.aspire_text,
  unlocked: !!v.email, scores: v.email ? v.scores : null,
});

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const v = await load((await ctx.params).code);
  if (!v) return NextResponse.json({ error: "We couldn't find that report." }, { status: 404 });
  return NextResponse.json(shape(v));
}

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = (await ctx.params).code.toUpperCase();
  const b = await req.json().catch(() => null);
  if (!b || !emailOk(b.email)) return NextResponse.json({ error: "Enter a valid email to see your results." }, { status: 400 });
  const { error } = await db().from("visitors").update({
    email: b.email.trim().toLowerCase(), email_source: "report",
    company: typeof b.company === "string" ? b.company.slice(0, 120) || null : null,
    title: typeof b.title === "string" ? b.title.slice(0, 120) || null : null,
  }).eq("code", code);
  if (error) return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 });
  const v = await load(code);
  return v ? NextResponse.json(shape(v)) : NextResponse.json({ error: "We couldn't find that report." }, { status: 404 });
}
