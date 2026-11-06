"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Entry = { id: string; name: string; d: string; u: string };
type Profile = { id: string; name: string; group: string; tests: { t: string; name: string; d: string; u: string; tier: string; tierLabel: string }[]; combine: number | null; standing: { rank: number; total: number } | null; club: boolean };
type Data = { count: number; views: Record<string, { label: string; F: Entry[]; M: Entry[] }[]>; club: string[]; people: Profile[] };
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
    <path d="M-20 870 C 300 820, 560 900, 900 855 S 1400 800, 1640 840" fill="none" stroke="#B2EBF0" strokeOpacity="0.14" strokeWidth="6" strokeLinecap="round" />
  </svg>
);

/* Sticker illustration, faded into the top-right corner and bleeding off the edges. */
const LEAF = "M0 0 C 9 -12, 27 -12, 36 0 C 27 12, 9 12, 0 0Z";
const STAR = "M0 -14 L3.5 -3.5 L14 0 L3.5 3.5 L0 14 L-3.5 3.5 L-14 0 L-3.5 -3.5Z";
const Flourish = () => (
  <svg className="flourish" viewBox="0 0 640 380" aria-hidden="true">
    <g fill="none" strokeLinecap="round">
      <path d="M-40 230 C 30 130, 150 84, 236 128 C 300 160, 286 238, 224 238 C 184 238, 176 200, 206 192" stroke="#F4F2EC" strokeWidth="7" />
      <path d="M90 -30 C 190 40, 360 44, 520 -6" stroke="#B2EBF0" strokeWidth="9" />
      <path d="M150 -24 C 250 30, 380 30, 470 0" stroke="#F4F2EC" strokeWidth="4" />
      <path d="M470 60 C 528 92, 566 160, 524 206 C 498 234, 454 214, 468 184" stroke="#F4F2EC" strokeWidth="6" />
      <path d="M-30 318 C 110 270, 250 344, 420 292 C 470 276, 520 280, 560 300" stroke="#B2EBF0" strokeWidth="7" />
      <path d="M-20 350 C 120 316, 230 372, 360 340" stroke="#F4F2EC" strokeWidth="3.5" />
    </g>
    <g fill="#B2EBF0">
      <path d={LEAF} transform="translate(250 120) rotate(-30)" /><path d={LEAF} transform="translate(420 300) rotate(20)" />
      <path d={LEAF} transform="translate(40 120) rotate(-70)" /><path d={LEAF} transform="translate(560 120) rotate(60)" />
    </g>
    <g fill="#FFCA42"><path d={STAR} transform="translate(560 34) scale(1.3)" /><path d={STAR} transform="translate(330 250) scale(0.8)" /><path d={STAR} transform="translate(70 40) scale(0.9)" /></g>
    <g fill="#F4F2EC"><circle cx="300" cy="64" r="5" /><circle cx="600" cy="230" r="4" /><circle cx="150" cy="270" r="4" /><circle cx="500" cy="250" r="3" /></g>
  </svg>
);

export default function Board() {
  const [data, setData] = useState<Data | null>(null);
  const [view, setView] = useState("overall");
  const [auto, setAuto] = useState(true);
  const [find, setFind] = useState("");
  const [prog, setProg] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const idleAt = useRef(0), t0 = useRef(0);

  const load = useCallback(() => fetch("/api/board", { cache: "no-store" }).then((r) => r.ok && r.json()).then((j) => j && setData(j)).catch(() => {}), []);
  useEffect(() => { load(); const h = setInterval(load, POLL_MS); return () => clearInterval(h); }, [load]);
  useEffect(() => {
    t0.current = performance.now();
    const h = setInterval(() => {
      const now = performance.now();
      if (!auto) { if (now - idleAt.current > IDLE_MS) { setAuto(true); setFind(""); setOpenId(null); t0.current = now; } setProg(0); return; }
      const f = (now - t0.current) / ROTATE_MS; setProg(Math.min(1, f));
      if (f >= 1) { t0.current = now; setView((v) => VIEWS[(VIEWS.findIndex((x) => x[0] === v) + 1) % VIEWS.length][0]); }
    }, 120);
    return () => clearInterval(h);
  }, [auto]);
  const touch = () => { setAuto(false); idleAt.current = performance.now(); };
  const q = find.trim().toLowerCase();
  const matches = q ? (data?.people ?? []).filter((m) => m.name.toLowerCase().includes(q)).slice(0, 6) : [];
  const open = openId ? data?.people.find((m) => m.id === openId) : null;
  const slot = (e: Entry | undefined, i: number) => e
    ? <button type="button" key={i} onClick={() => setOpenId(e.id)} className={`slot ${i === 0 ? "first" : ""} ${q && e.name.toLowerCase().startsWith(q) ? "me" : ""}`}><span className="rk">{i + 1}</span><span className="nm">{e.name}</span><span className="vl num">{e.d}<small>{e.u}</small></span></button>
    : <div key={i} className="slot open"><span className="rk">{i + 1}</span><span className="nm">Open spot</span><span /></div>;

  return (
    <section className="b-shell kiosk" onPointerDown={touch}>
      <div className="stage" id="stage">
        <div className="field-bg"><Deco /><Flourish /></div>
        <div className="b-grid">
          <div className="b-top">
            <div className="lockup"><span className="l1">Longevity</span><span className="l2"><svg className="sw" viewBox="0 0 60 16" aria-hidden="true"><path d="M4 5 H58 M14 11 H58" /></svg><span>Combine</span><svg className="sw flip" viewBox="0 0 60 16" aria-hidden="true"><path d="M4 5 H58 M14 11 H58" /></svg></span><svg className="spark s1" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6-2.6 7.9-2.6-7.9-7.9-2.6 7.9-2.6z" /></svg><svg className="spark s2" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6-2.6 7.9-2.6-7.9-7.9-2.6 7.9-2.6z" /></svg></div>
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
            <div className="b-search">
              <input className="b-find" placeholder="Find your name" value={find} onChange={(e) => { touch(); setFind(e.target.value); }} aria-label="Find your name" autoComplete="off" />
              {q && <div className="b-results" role="listbox">{matches.length ? matches.map((m) => <button key={m.id} type="button" onClick={() => { setOpenId(m.id); setFind(""); }}><b>{m.name}</b><span>{m.group}</span></button>)
                : <p>No one by that name yet. Only people who chose to show on the board appear here.</p>}</div>}
            </div>
            <img className="glogo" src="/logo-cream.png" alt="groove" />
          </div>
        </div>
        {open && <div className="b-scrim" onClick={() => setOpenId(null)} />}
        <aside className={`b-panel ${open ? "on" : ""}`} aria-hidden={!open}>{open && <>
          <button type="button" className="b-x" onClick={() => setOpenId(null)} aria-label="Close">×</button>
          <span className="pk">{open.group}</span><h2>{open.name}</h2>
          {open.combine != null && <div className="pc"><span className="v num">{open.combine}</span><span>Combine Score{open.standing ? <><br /><b>#{open.standing.rank}</b> of {open.standing.total} in {open.group.toLowerCase()}</> : null}</span></div>}
          {open.club && <span className="pclub">2:00 Club</span>}
          <div className="pt">{open.tests.map((x) => <div key={x.t} className="prow"><span className="pn">{x.name}</span><span className="pv num">{x.d}<small>{x.u}</small></span><span className={`ptier ${x.tier}`}>{x.tierLabel}</span></div>)}</div>
          {open.combine == null && <p className="pnote">Finish all five tests to get a Combine Score and a spot on the Combine board.</p>}
        </>}</aside>
        <div className="b-prog" aria-hidden="true"><i style={{ width: `${prog * 100}%` }} /></div>
      </div>
    </section>
  );
}
