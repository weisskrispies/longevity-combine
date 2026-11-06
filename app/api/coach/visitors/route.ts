import { NextResponse } from "next/server";
import { db, isCoach, newCode, emailOk } from "@/lib/server";

export const dynamic = "force-dynamic";
const COLS = "id, code, name, age, sex, opt_in, giveaway, email, company, title, aspire, aspire_text, role, scores, floor_detail, created_at";

export async function GET(req: Request) {
  if (!(await isCoach())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  let query = db().from("visitors").select(COLS).order("created_at", { ascending: false }).limit(q ? 25 : 8);
  if (q) query = query.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
  const [{ data, error }, { count }] = await Promise.all([query, db().from("visitors").select("id", { count: "exact", head: true })]);
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
  const row = {
    code: newCode(), name: b.name.trim().slice(0, 40), age, sex: b.sex, opt_in: b.opt_in !== false, giveaway: !!b.giveaway,
    email: emailOk(b.email) ? b.email.trim().toLowerCase() : null, email_source: emailOk(b.email) ? "giveaway" : null,
    aspire: typeof b.aspire === "string" ? b.aspire.slice(0, 30) : null, aspire_text: typeof b.aspire_text === "string" ? b.aspire_text.slice(0, 120) : null,
    role: typeof b.role === "string" ? b.role.slice(0, 30) : null,
  };
  for (let i = 0; i < 3; i++) {
    const { data, error } = await db().from("visitors").insert(row).select(COLS).single();
    if (!error) return NextResponse.json({ visitor: data });
    if (!error.message.includes("duplicate")) return NextResponse.json({ error: error.message }, { status: 500 });
    row.code = newCode();
  }
  return NextResponse.json({ error: "Couldn't create a code. Try again." }, { status: 500 });
}
