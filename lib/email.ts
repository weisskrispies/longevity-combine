import "server-only";
import { db } from "./server";
import { headlineFor, type Sex } from "./norms";

const SITE = process.env.SITE_URL || "https://combine.groovehealth.com";

/**
 * Sends the "your results" email through Loops, once per visitor.
 * Inactive until LOOPS_API_KEY and LOOPS_TRANSACTIONAL_ID are set in Vercel.
 * The Loops template uses data variables: firstName, reportUrl, headline.
 */
export async function sendReportEmail(v: { id: string; code: string; name: string; email: string; emailed_at?: string | null; age?: number; sex?: string; scores?: Record<string, number> }) {
  const key = process.env.LOOPS_API_KEY?.trim(), tid = process.env.LOOPS_TRANSACTIONAL_ID?.trim();
  if (!key || !tid || v.emailed_at) return { sent: false };
  try {
    const r = await fetch("https://app.loops.so/api/v1/transactional", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ transactionalId: tid, email: v.email, addToAudience: true, dataVariables: { firstName: v.name.split(" ")[0], reportUrl: `${SITE}/r/${v.code}`, headline: v.age && v.sex && v.scores ? headlineFor({ age: v.age, sex: v.sex as Sex, scores: v.scores }) : "Your results are ready." } }),
    });
    if (!r.ok) return { sent: false, error: `Loops ${r.status}` };
    await db().from("visitors").update({ emailed_at: new Date().toISOString() }).eq("id", v.id);
    return { sent: true };
  } catch {
    return { sent: false };
  }
}
