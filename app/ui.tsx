"use client";
import { useCallback, useRef, useState, type ReactNode } from "react";

export function Logo({ tone = "auto" }: { tone?: "auto" | "cream" }) {
  if (tone === "cream") return <img className="logo" src="/logo-cream.png" alt="groove" />;
  return <><img className="logo logo-light" src="/logo-teal.png" alt="groove" /><img className="logo logo-dark" src="/logo-cream.png" alt="" /></>;
}

export function Waves() {
  return (
    <svg className="deco" viewBox="0 0 600 300" preserveAspectRatio="none" aria-hidden="true">
      <path d="M-20 250 C 120 200, 220 300, 360 250 S 560 190, 640 230" fill="none" stroke="#B2EBF0" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
      <path d="M-20 272 C 140 228, 250 312, 400 268 S 580 222, 640 252" fill="none" stroke="#F4F2EC" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function useToast(): [ReactNode, (m: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => { setMsg(m); if (t.current) clearTimeout(t.current); t.current = setTimeout(() => setMsg(null), 3000); }, []);
  return [msg ? <div className="toast" role="status">{msg}</div> : null, show];
}
