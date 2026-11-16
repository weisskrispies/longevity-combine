import { NextResponse } from "next/server";
import { db, emailOk, isCoach } from "@/lib/server";
import { sendReportEmail } from "@/lib/email";
import { dayLong, ptDay } from "@/lib/days";
import { BRACKETS, bracketOf, combine, displayName, hasAny, type Sex } from "@/lib/norms";

export const dynamic = "force-dynamic";
const COLS = "id, code, name, age, sex, aspire, aspire_text, role, company, scores, email, emailed_at, interest, created_at";

type Row = { created_at: string; id: string; code: string; name: string; age: number; sex: string; aspire: string | null; aspire_text: string | null; role: string | null; company: string | null; scores: Record<string, number>; email: string | null; emailed_at?: string | null; interest?: string | null };
async function load(code: string): Promise<Row | null> {
  const c = code.toUpperCase();
  const r = await db().from("visitors").select(COLS).eq("code", c).maybeSingle();
  if (!r.error) return r.data as Row | null;
  // Columns from schema v2 not added yet: fall back so reports still work.
  const r2 = await db().from("visitors").select("id, code, name, age, sex, aspire, aspire_text, role, company, scores, email, created_at").eq("code", c).maybeSingle();
  return r2.data as Row | null;
}
// Never send the email itself back; only whether the report is unlocked.
const shape = (v: Row, coach = false) => ({
  first: v.name.split(" ")[0], name: displayName(v.name), age: v.age, sex: v.sex, aspire: v.aspire, aspire_text: v.aspire_text,
  role: v.role, company: v.company, interest: v.interest, unlocked: !!v.email || coach, scores: v.email || coach ? v.scores : null,
});

/** Their spot on the board: top 2 in their age group and sex, plus their own rank. Full-five finishers only. */
async function standing(v: Row, coach = false) {
  const me = { age: v.age, sex: v.sex as Sex, scores: v.scores || {} };
  if ((!v.email && !coach) || !hasAny(me)) return null;
  const b = bracketOf(v.age), br = BRACKETS.find((x) => x[0] === b)!;
  // Ranked against people tested the same day (Vegas time) as this visitor.
  const myDay = ptDay(v.created_at);
  const { data } = await db().from("visitors").select("id, name, age, sex, opt_in, scores, created_at").eq("sex", v.sex).gte("age", br[2]).lte("age", br[3]);
  const field = (data ?? []).filter((x) => ptDay(x.created_at) === myDay).map((x) => ({ ...x, s: combine({ age: x.age, sex: x.sex as Sex, scores: x.scores || {} }), full: hasAny({ age: x.age, sex: x.sex as Sex, scores: x.scores || {} }) }))
    .filter((x) => x.full).sort((a, c) => c.s - a.s);
  const rank = field.findIndex((x) => x.id === v.id) + 1;
  return {
    group: `${v.sex === "F" ? "Women" : "Men"}, ${br[1]}`, rank, total: field.length, score: combine(me),
    day: dayLong(myDay), isToday: myDay === ptDay(),
    top: field.slice(0, 2).map((x, i) => ({ rank: i + 1, name: x.id === v.id || x.opt_in ? displayName(x.name) : "Hidden", score: x.s, me: x.id === v.id })),
  };
}

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const v = await load((await ctx.params).code);
  if (!v) return NextResponse.json({ error: "We couldn't find that report." }, { status: 404 });
  // A signed-in coach iPad opens the report directly; people scanning the QR on their own phone unlock with email.
  const coach = new URL(req.url).searchParams.get("from") === "coach" && (await isCoach()); // needs both: the coach link and a signed-in coach device
  return NextResponse.json({ ...shape(v, coach), standing: await standing(v, coach) });
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
    return NextResponse.json({ ...shape({ ...v0, interest }), standing: await standing(v0) });
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
  return v ? NextResponse.json({ ...shape(v), standing: await standing(v) }) : NextResponse.json({ error: "We couldn't find that report." }, { status: 404 });
}
