"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Entry = { name: string; d: string; u: string };
type Data = { count: number; views: Record<string, { label: string; F: Entry[]; M: Entry[] }[]>; club: string[] };
const VIEWS: [string, string][] = [["overall", "Combine Score"], ["grip", "Grip"], ["balance", "Balance"], ["wallsit", "Wall sit"], ["pushups", "Push-ups"], ["floor", "Floor rise"], ["club", "2:00 Club"]];
const EXPLAIN: Record<string, string> = {
  overall: "All five tests. Each scores up to 100 against people your age and sex. Max 500.",
  grip: "Best hand, ranked against your age.", balance: "Eyes closed, one leg. Ranked against your age.",
  wallsit: "Ranked against your age. Hold two minutes to join the 2:00 Club.", pushups: "Men full, women from the knees. 60 seconds.",
  floor: "Down to the floor and back up. Scored out of 10.", club: "Held a wall sit for the full two minutes.",
};
const ROTATE_MS = 10000, IDLE_MS = 30000, POLL_MS = 5000;

const Deco = () => (
  <svg className="deco" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
    <g fill="none" strokeLinecap="round">
      <path d="M440 30 C 520 6, 620 18, 680 48" stroke="#B2EBF0" strokeOpacity="0.5" strokeWidth="5" />
      <path d="M-20 860 C 300 790, 560 900, 900 840 S 1400 770, 1640 820" stroke="#B2EBF0" strokeOpacity="0.18" strokeWidth="7" />
      <path d="M1380 60 C 1450 30, 1530 50, 1560 100" stroke="#F4F2EC" strokeOpacity="0.35" strokeWidth="5" />
    </g>
    <g fill="#B2EBF0" fillOpacity="0.55"><path d="M680 48 q 18 -22 36 0 q -18 22 -36 0z" /><path d="M40 80 q 14 -18 28 0 q -14 18 -28 0z" /></g>
    <g fill="#FFCA42"><path d="M500 60 l6 18 18 6 -18 6 -6 18 -6 -18 -18 -6 18 -6z" /><path d="M1540 150 l5 14 14 5 -14 5 -5 14 -5 -14 -14 -5 14 -5z" /></g>
    <g fill="#F4F2EC" fillOpacity="0.55"><circle cx="410" cy="60" r="4" /><circle cx="1350" cy="250" r="3" /></g>
  </svg>
);

export default function Board() {
  const [data, setData] = useState<Data | null>(null);
  const [view, setView] = useState("overall");
  const [auto, setAuto] = useState(true);
  const [find, setFind] = useState("");
  const [prog, setProg] = useState(0);
  const idleAt = useRef(0), t0 = useRef(0);

  const load = useCallback(() => fetch("/api/board", { cache: "no-store" }).then((r) => r.ok && r.json()).then((j) => j && setData(j)).catch(() => {}), []);
  useEffect(() => { load(); const h = setInterval(load, POLL_MS); return () => clearInterval(h); }, [load]);
  useEffect(() => {
    t0.current = performance.now();
    const h = setInterval(() => {
      const now = performance.now();
      if (!auto) { if (now - idleAt.current > IDLE_MS) { setAuto(true); setFind(""); t0.current = now; } setProg(0); return; }
      const f = (now - t0.current) / ROTATE_MS; setProg(Math.min(1, f));
      if (f >= 1) { t0.current = now; setView((v) => VIEWS[(VIEWS.findIndex((x) => x[0] === v) + 1) % VIEWS.length][0]); }
    }, 120);
    return () => clearInterval(h);
  }, [auto]);
  const touch = () => { setAuto(false); idleAt.current = performance.now(); };
  const q = find.trim().toLowerCase();
  const slot = (e: Entry | undefined, i: number) => e
    ? <div key={i} className={`slot ${i === 0 ? "first" : ""} ${q && e.name.toLowerCase().startsWith(q) ? "me" : ""}`}><span className="rk">{i + 1}</span><span className="nm">{e.name}</span><span className="vl num">{e.d}<small>{e.u}</small></span></div>
    : <div key={i} className="slot open"><span className="rk">{i + 1}</span><span className="nm">Open spot</span><span /></div>;

  return (
    <section className="b-shell kiosk" onPointerDown={touch}>
      <div className="stage" id="stage">
        <div className="field-bg"><Deco /></div>
        {!auto && <span className="b-paused">Exploring · rotation resumes soon</span>}
        <div className="b-grid">
          <div className="b-top">
            <div className="lockup"><span className="l1">Longevity</span><span className="l2">Combine</span></div>
            <div className="v-title"><span className="rib">{VIEWS.find((v) => v[0] === view)![1]}</span><span className="exp">{EXPLAIN[view]}</span></div>
            <div className="tally"><span className="n num">{data?.count ?? "–"}</span><span className="l">Tested today</span></div>
          </div>
          {view === "club"
            ? <div className="club"><div className="club-badge"><span className="t">2:00</span><span className="s">Club</span></div>
                <div className="club-names">{data?.club.length ? data.club.map((n, i) => <span key={i}>{n}</span>) : <span className="em">No members yet. Two minutes. You in?</span>}</div></div>
            : <div className="b-cols">{(data?.views[view] ?? []).map((c) => (
                <div className="b-col" key={c.label}><h3>{c.label}</h3><span className="sx">Women</span>{[0, 1].map((i) => slot(c.F[i], i))}<span className="sx">Men</span>{[0, 1].map((i) => slot(c.M[i], i))}</div>))}</div>}
          <div className="b-foot">
            <nav className="b-tabs" aria-label="Leaderboard views">{VIEWS.map(([k, l]) => <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}>{l}</button>)}</nav>
            <input className="b-find" placeholder="Find your name" value={find} onChange={(e) => { touch(); setFind(e.target.value); }} aria-label="Find your name" autoComplete="off" />
            <img className="glogo" src="/logo-cream.png" alt="groove" />
          </div>
        </div>
        <div className="b-prog" aria-hidden="true"><i style={{ width: `${prog * 100}%` }} /></div>
      </div>
    </section>
  );
}
