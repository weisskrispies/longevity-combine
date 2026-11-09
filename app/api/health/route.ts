import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/** Setup check. Reports what's configured without revealing any values. */
export async function GET() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vxijgfpkmowmrdfowohb.supabase.co"), raw = process.env.SUPABASE_SECRET_KEY || "", key = raw.trim().split(/\s+/)[0] || undefined;
  const out: Record<string, string> = {
    supabase_url: url ? "set" : "MISSING: add NEXT_PUBLIC_SUPABASE_URL in Vercel",
    secret_key: key ? (key.startsWith("sb_publishable") ? "WRONG KEY: this is the publishable key, use a Secret key" : "set") : "MISSING: add SUPABASE_SECRET_KEY in Vercel, then redeploy",
    coach_pin: process.env.COACH_PIN ? "custom" : "default (2026)",
    key_format: raw && /\s/.test(raw.trim()) ? "has extra text; using the first line (worth re-pasting cleanly)" : "clean",
  };
  if (url && key) {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await sb.from("visitors").select("id").limit(1);
    if (!error) { const v2 = await sb.from("visitors").select("emailed_at, interest").limit(1); out.schema_v2 = v2.error ? "MISSING: run the two ALTER TABLE lines (emailed_at, interest) in the SQL Editor" : "ok"; }
    out.database = error ? (/does not exist|schema cache/.test(error.message) || error.code === "42P01" || error.code === "PGRST205" ? "TABLE MISSING: run supabase/schema.sql in the SQL Editor" : `ERROR: ${error.message.split(key).join("[key]").slice(0, 200)}`) : "ok";
  } else out.database = "not checked";
  out.ready = Object.values(out).every((v) => !/MISSING|WRONG|ERROR/.test(v)) ? "yes" : "no";
  return NextResponse.json(out, { headers: { "cache-control": "no-store" } });
}
