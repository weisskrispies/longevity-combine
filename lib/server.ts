import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

/** Server-only Supabase client using the secret key. Never import from client code. */
export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

/* Coach access: one shared PIN (COACH_PIN), remembered in a signed cookie. */
const COOKIE = "lc_coach";
const sign = (v: string) => createHmac("sha256", process.env.SUPABASE_SECRET_KEY || "dev").update(v).digest("hex");
export const pinOk = (pin: string) => {
  const real = process.env.COACH_PIN || "2026";
  if (!real || pin.length !== real.length) return false;
  return timingSafeEqual(Buffer.from(pin), Buffer.from(real));
};
export async function setCoachCookie() {
  (await cookies()).set(COOKIE, `ok.${sign("ok")}`, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60 });
}
export async function isCoach() {
  const v = (await cookies()).get(COOKIE)?.value;
  return v === `ok.${sign("ok")}`;
}

export const newCode = () => {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  return Array.from({ length: 6 }, () => abc[Math.floor(Math.random() * abc.length)]).join("");
};
export const emailOk = (e: unknown): e is string => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length < 200;
