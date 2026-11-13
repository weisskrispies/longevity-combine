import { NextResponse } from "next/server";
import { db, isCoach, newCode, emailOk } from "@/lib/server";

export const dynamic = "force-dynamic";
const COLS = "id, code, name, age, sex, opt_in, giveaway, email, company, title, aspire, aspire_text, role, scores, floor_detail, created_at";
const V3 = ", waiver_id, email_results";
const noV3 = (m?: string) => !!m && /waiver_id|email_results|waivers/.test(m);

export async function GET(req: Request) {
  if (!(await isCoach())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!process.env.SUPABASE_SECRET_KEY) return NextResponse.json({ error: "SUPABASE_SECRET_KEY isn't set in Vercel yet." }, { status: 500 });
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const list = (cols: string) => { let query = db().from("visitors").select(cols).order("created_at", { ascending: false }).limit(q ? 25 : 8); if (q) query = query.ilike("name", `%${q.replace(/[%_]/g, "")}%`); return query; };
  let [{ data, error }, { count }] = await Promise.all([list(COLS + V3), db().from("visitors").select("id", { count: "exact", head: true })]);
  if (error && noV3(error.message)) ({ data, error } = await list(COLS)); // waiver SQL not run yet
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ visitors: data, total: count ?? 0 });
}

export async function POST(req: Request) {
  if (!(await isCoach())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b || typeof b.name !== "string" || !b.name.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  const age = Number(b.age);
  if (!(age >= 18 && age <= 105)) return NextResponse.json({ error: "Age must be 18 to 105." }, { status: 400 });
  if (b.sex !== "F" && b.sex !== "M") return NextResponse.json({ error: "Pick female or male." }, { status: 400 });
  if (b.giveaway && !emailOk(b.email)) return NextResponse.json({ error: "The giveaway needs a valid email." }, { status: 400 });
  // Optional signed waiver, signed in the modal before the visitor was saved.
  const w = typeof b.waiver_id === "string" ? (await db().from("waivers").select("id, visitor_id, consent_leaderboard, consent_email, email").eq("id", b.waiver_id).single()).data : null;
  const giveEmail = b.giveaway && emailOk(b.email) ? b.email.trim().toLowerCase() : null, email = giveEmail || w?.email || null;
  const row = {
    code: newCode(), name: b.name.trim().replace(/\s+/g, " ").slice(0, 60), age, sex: b.sex, opt_in: w ? !!w.consent_leaderboard : b.opt_in !== false, giveaway: !!b.giveaway,
    email, email_source: giveEmail ? "giveaway" : email ? "waiver" : null,
    aspire: typeof b.aspire === "string" ? b.aspire.split(",").filter((k: string) => /^[a-z]+$/.test(k)).slice(0, 3).join(",") || null : null, aspire_text: typeof b.aspire_text === "string" ? b.aspire_text.slice(0, 120) : null,
    role: typeof b.role === "string" ? b.role.slice(0, 30) : null,
  };
  const link = w && !w.visitor_id ? w.id : null;
  let extra: Record<string, unknown> = { waiver_id: link, email_results: !!w?.consent_email };
  for (let i = 0; i < 3; i++) {
    let { data, error } = await db().from("visitors").insert({ ...row, ...extra }).select(COLS).single<{ id: string }>();
    if (error && noV3(error.message)) { extra = {}; ({ data, error } = await db().from("visitors").insert(row).select(COLS).single<{ id: string }>()); } // waiver SQL not run yet
    if (!error && data) { if (link && "waiver_id" in extra) await db().from("waivers").update({ visitor_id: data.id }).eq("id", link); return NextResponse.json({ visitor: { ...data, ...extra } }); }
    if (!error) break;
    if (!error.message.includes("duplicate")) return NextResponse.json({ error: error.message }, { status: 500 });
    row.code = newCode();
  }
  return NextResponse.json({ error: "Couldn't create a code. Try again." }, { status: 500 });
}
