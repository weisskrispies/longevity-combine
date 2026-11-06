import { NextResponse } from "next/server";
import { pinOk, setCoachCookie } from "@/lib/server";

export async function POST(req: Request) {
  const { pin } = await req.json().catch(() => ({ pin: "" }));
  if (typeof pin !== "string" || !pinOk(pin.trim())) return NextResponse.json({ error: "That PIN didn't work. Check with Patrick." }, { status: 401 });
  await setCoachCookie();
  return NextResponse.json({ ok: true });
}
