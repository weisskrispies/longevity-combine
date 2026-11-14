import { NextResponse } from "next/server";
import { db, isCoach, emailOk } from "@/lib/server";
import { WAIVER } from "@/lib/waiver";

export const dynamic = "force-dynamic";

/** Records a signed waiver. Signed by the participant on the coach iPad; the server sets the timestamp. */
export async function POST(req: Request) {
  if (!(await isCoach())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  if (b.version !== WAIVER.version) return NextResponse.json({ error: "The waiver was updated. Reloading.", reload: true }, { status: 409 });
  const name = typeof b.name === "string" ? b.name.trim().replace(/\s+/g, " ").slice(0, 80) : "";
  if (b.agreed !== true) return NextResponse.json({ error: "Check the box to agree to the release." }, { status: 400 });
  if (name.split(" ").length < 2) return NextResponse.json({ error: "Type your full name, first and last." }, { status: 400 });
  const email = b.email && String(b.email).trim() ? String(b.email).trim().toLowerCase() : null;
  if (email && !emailOk(email)) return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
  if (b.consent_giveaway && !email) return NextResponse.json({ error: "The speaker giveaway needs an email." }, { status: 400 });
  const row = {
    signed_name: name, version: WAIVER.version, agreed: true,
    device: (req.headers.get("user-agent") || "").slice(0, 300) || null,
    consent_leaderboard: !!b.consent_leaderboard, consent_email: !!email, consent_giveaway: !!b.consent_giveaway, email,
  };
  const { data: w, error } = await db().from("waivers").insert(row).select("id, signed_name, signed_at, consent_leaderboard, consent_email, consent_giveaway, email").single();
  if (error) return NextResponse.json({ error: /waivers/.test(error.message) ? "The waiver table isn't set up. Run the v3 SQL in Supabase." : error.message }, { status: 500 });

  // Signing for a visitor who already exists (set up before waivers were required).
  if (typeof b.visitor_id === "string") {
    const { data: v } = await db().from("visitors").select("id, email").eq("id", b.visitor_id).single();
    if (v) {
      await db().from("visitors").update({ waiver_id: w.id, opt_in: w.consent_leaderboard, email_results: w.consent_email, ...(w.consent_giveaway ? { giveaway: true } : {}), ...(email && !v.email ? { email, email_source: "waiver" } : {}) }).eq("id", v.id);
      await db().from("waivers").update({ visitor_id: v.id }).eq("id", w.id);
    }
  }
  return NextResponse.json({ waiver: w });
}
