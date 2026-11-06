import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/** Setup check. Reports what's configured without revealing any values. */
export async function GET() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vxijgfpkmowmrdfowohb.supabase.co"), key = process.env.SUPABASE_SECRET_KEY;
  const out: Record<string, string> = {
    supabase_url: url ? "set" : "MISSING: add NEXT_PUBLIC_SUPABASE_URL in Vercel",
    secret_key: key ? (key.startsWith("sb_publishable") ? "WRONG KEY: this is the publishable key, use a Secret key" : "set") : "MISSING: add SUPABASE_SECRET_KEY in Vercel, then redeploy",
    coach_pin: process.env.COACH_PIN ? "custom" : "default (2026)",
  };
  if (url && key) {
    const { error } = await createClient(url, key, { auth: { persistSession: false } }).from("visitors").select("id", { head: true, count: "exact" });
    out.database = error ? (error.message.includes("does not exist") || error.code === "42P01" ? "TABLE MISSING: run supabase/schema.sql in the SQL Editor" : `ERROR: ${error.message}`) : "ok";
  } else out.database = "not checked";
  out.ready = Object.values(out).every((v) => !/MISSING|WRONG|ERROR/.test(v)) ? "yes" : "no";
  return NextResponse.json(out, { headers: { "cache-control": "no-store" } });
}
