"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { ORDER, TESTS, TIER, fmt, isFull, percentile, tierOf, unitOf, combine, clampScore, type Scores, type Sex, type TestId } from "@/lib/norms";
import { ASPIRE, ROLES } from "@/lib/copy";
import { Logo, Waves, useToast } from "@/app/ui";

type Floor = { dn: number; dw: number; un: number; uw: number };
type Visitor = { id: string; code: string; name: string; age: number; sex: Sex; opt_in: boolean; giveaway: boolean; email: string | null; aspire: string | null; aspire_text: string | null; role: string | null; scores: Scores; floor_detail: Floor | null };
type Mode = "home" | "visitor" | "scores" | "results";
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const SITE = typeof window !== "undefined" ? window.location.origin : "https://combine.groovehealth.com";

/* ---------- Save queue: retries patches until the network comes back ---------- */
const QKEY = "lc_pending";
const loadQ = (): Record<string, Record<string, unknown>> => { try { return JSON.parse(localStorage.getItem(QKEY) || "{}"); } catch { return {}; } };
const saveQ = (q: Record<string, Record<string, unknown>>) => { try { localStorage.setItem(QKEY, JSON.stringify(q)); } catch {} };

export default function Coach() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [list, setList] = useState<Visitor[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("home");
  const [cur, setCur] = useState<Visitor | null>(null);
  const [pending, setPending] = useState(0);
  const [toast, show] = useToast();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loadErr, setLoadErr] = useState("");
  const refresh = useCallback(async (query = q) => {
    try {
      const r = await fetch(`/api/coach/visitors${query ? `?q=${encodeURIComponent(query)}` : ""}`, { cache: "no-store" });
      if (r.status === 401) { setAuthed(false); setLoadErr(""); return; }
      const j = await r.json().catch(() => ({ error: `Server error (${r.status})` }));
      if (!r.ok) { setLoadErr(j.error || `Server error (${r.status})`); setAuthed((a) => a ?? false); return; }
      setList(j.visitors); setTotal(j.total); setAuthed(true); setLoadErr("");
    } catch { setLoadErr("Can't reach the server. Check the WiFi."); setAuthed((a) => a ?? false); }
  }, [q]);
  useEffect(() => { refresh(""); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => authed && refresh(q), 250); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const flush = useCallback(async () => {
    const queue = loadQ(); const ids = Object.keys(queue); setPending(ids.length);
    for (const id of ids) {
      try { const r = await fetch(`/api/coach/visitors/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(queue[id]) });
        if (r.ok || r.status === 400) { const nq = loadQ(); delete nq[id]; saveQ(nq); } } catch { /* stay queued */ }
    }
    setPending(Object.keys(loadQ()).length);
  }, []);
  useEffect(() => { flush(); const h = setInterval(flush, 5000); window.addEventListener("online", flush); return () => { clearInterval(h); window.removeEventListener("online", flush); }; }, [flush]);

  const queuePatch = (v: Visitor, patch: Record<string, unknown>) => {
    const qq = loadQ(); qq[v.id] = { ...(qq[v.id] || {}), ...patch }; saveQ(qq); setPending(Object.keys(qq).length);
    if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(flush, 500);
  };
  const updateScores = (scores: Scores, floor_detail?: Floor | null) => {
    if (!cur) return; const v = { ...cur, scores, ...(floor_detail !== undefined ? { floor_detail } : {}) };
    setCur(v); queuePatch(v, floor_detail !== undefined ? { scores, floor_detail } : { scores });
  };

  if (authed === null) return <div className="c-wrap gutter"><p className="muted" style={{ paddingTop: 40 }}>Loading…</p></div>;
  const errBox = loadErr ? <div className="panel" role="alert" style={{ maxWidth: 520, borderColor: "#E0A800" }}><b>Something's not set up yet</b><p className="small">{loadErr}</p><p className="small muted">Open <a className="textlink" href="/api/health" target="_blank" rel="noopener">/api/health</a> to see what's missing.</p></div> : null;
  if (!authed) return (
    <div className="c-wrap gutter"><header className="c-head"><Logo /><span className="div" /><span className="name">Longevity Combine</span></header>
      <form className="panel" style={{ maxWidth: 420 }} onSubmit={async (e) => { e.preventDefault(); try { const r = await fetch("/api/coach/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pin }) }); if (r.ok) refresh(""); else show((await r.json().catch(() => ({ error: `Server error (${r.status})` }))).error); } catch { show("Can't reach the server. Check the WiFi."); } }}>
        <h3>Coach sign-in</h3>
        <div className="field"><label htmlFor="pin">Team PIN</label><input className="input num" id="pin" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} /></div>
        <button className="btn" disabled={!pin}>Sign in</button>
      </form>{errBox}{toast}</div>
  );

  const open = (v: Visitor) => { setCur(v); setMode("results"); };
  const close = () => { setMode("home"); setCur(null); refresh(); };

  return (
    <>
      <div className="c-wrap gutter">
        <header className="c-head"><Logo /><span className="div" /><span className="name">Longevity Combine</span>
          <span className="count">{pending ? <><b>{pending}</b> saving…</> : <><b className="num">{total}</b> tested today</>}</span></header>
        {errBox}
        <div className="c-home">
          <section className="c-hero"><Waves />
            <h1>Ready for the next visitor?</h1>
            <p>Takes about 20 seconds: name, age, and what they want to be doing at 85.</p>
            <button className="btn gold" onClick={() => setMode("visitor")}>Set up new visitor</button>
          </section>
          <section className="c-find">
            <div className="head"><h2 className="eyebrow">{q ? "Search results" : "Recent visitors"}</h2>
              <a className="small muted" href="/api/coach/export">Export CSV</a></div>
            <input className="input" type="search" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search visitors" autoComplete="off" />
            <div className="vlist">{list.length ? list.map((v) => { const n = Object.keys(v.scores || {}).length, r = v.role ? ROLES[v.role] : null; return (
              <button key={v.id} className="vrow" onClick={() => open(v)}>
                <span><span className="nm">{v.name}{r && r[1] !== "c" ? <span className={`tag ${r[1]}`}>{r[1].toUpperCase()}</span> : null}</span><span className="sub">{v.sex} {v.age} · {n === 5 ? "All five" : `${n} of 5`}</span></span>
                <span className="dots" aria-hidden="true">{ORDER.map((t) => <i key={t} className={v.scores?.[t] != null ? "on" : ""} />)}</span><span className="chev" aria-hidden="true">›</span>
              </button>); }) : <p className="empty">{q ? "No one by that name yet." : "No visitors yet. Set up the first one."}</p>}</div>
          </section>
        </div>
      </div>
      {mode !== "home" && (
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="s-title">
          {mode === "visitor" && <VisitorStep onClose={close} onCreated={(v) => { setCur(v); setMode("scores"); }} show={show} />}
          {mode === "scores" && cur && <ScoresStep v={cur} onScores={updateScores} onClose={() => { show("Saved. Search their name to pick up where you left off."); close(); }} onNext={() => setMode("results")} />}
          {mode === "results" && cur && <ResultsStep v={cur} onEdit={() => setMode("scores")} onClose={close} onEmail={(email, quiet) => { const v = { ...cur, email }; setCur(v); queuePatch(v, { email }); if (!quiet) show(`Saved. ${cur.name.split(" ")[0]}'s results are on their way to ${email}.`); }} />}
        </div>
      )}
      {toast}
    </>
  );
}

function Steps({ at, onClose }: { at: number; onClose: () => void }) {
  return (
    <div className="s-head"><span />
      <div className="steps">{["Visitor", "Scores", "Results"].map((l, i) => <span key={l} className={i === at ? "on" : i < at ? "past" : ""}><i>{i < at ? "✓" : i + 1}</i>{l}</span>)}</div>
      <button className="x" onClick={onClose} aria-label="Close">×</button></div>
  );
}

function VisitorStep({ onClose, onCreated, show }: { onClose: () => void; onCreated: (v: Visitor) => void; show: (m: string) => void }) {
  const [d, setD] = useState({ name: "", age: "", sex: "", opt_in: true, giveaway: false, email: "", aspire: [] as string[], aspire_text: "", role: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: unknown) => setD((x) => ({ ...x, [k]: v }));
  const age = Number(d.age), ok = d.name.trim() && age >= 18 && age <= 105 && d.sex && (!d.giveaway || emailOk(d.email));
  const chip = (name: string, val: string, label: string) => (
    <span key={val}><input type="radio" name={name} id={`${name}-${val}`} checked={(d as Record<string, unknown>)[name] === val} onChange={() => set(name, val)} /><label htmlFor={`${name}-${val}`}>{label}</label></span>
  );
  const goalChip = (val: string, label: string) => {
    const on = d.aspire.includes(val), full = d.aspire.length >= 3 && !on;
    return <span key={val}><input type="checkbox" id={`aspire-${val}`} checked={on} disabled={full} onChange={() => set("aspire", on ? d.aspire.filter((x) => x !== val) : [...d.aspire, val])} /><label htmlFor={`aspire-${val}`}>{label}</label></span>;
  };
  const submit = async () => {
    if (!ok || busy) return; setBusy(true);
    try {
      const r = await fetch("/api/coach/visitors", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...d, age, email: d.giveaway ? d.email : null, aspire: d.aspire.join(",") || null, aspire_text: d.aspire.includes("other") ? d.aspire_text : null, role: d.role || null }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error); onCreated(j.visitor);
    } catch (e) { show(e instanceof Error && e.message ? e.message : "Couldn't save. Check the WiFi and try again."); } finally { setBusy(false); }
  };
  return (
    <div className="sheet-in"><Steps at={0} onClose={onClose} />
      <div className="s-body"><h2 className="s-title" id="s-title">Who's stepping up?</h2>
        <div className="cols">
          <div className="panel">
            <div className="field"><label htmlFor="f-name">First name and last initial</label><input className="input" id="f-name" autoFocus autoComplete="off" autoCapitalize="words" enterKeyHint="next" placeholder="Linda R." value={d.name} onChange={(e) => set("name", e.target.value)} /></div>
            <div className="grid2">
              <div className="field"><label htmlFor="f-age">Age</label><input className="input num" id="f-age" type="number" inputMode="numeric" min={18} max={105} placeholder="64" value={d.age} onChange={(e) => set("age", e.target.value)} /></div>
              <div className="field"><span className="lab">Sex</span><div className="chips seg">{chip("sex", "F", "Female")}{chip("sex", "M", "Male")}</div></div>
            </div>
            <div>
              <label className="switch" htmlFor="f-opt"><span><b>Show on the leaderboard</b><span>First name and last initial only</span></span><input type="checkbox" id="f-opt" checked={d.opt_in} onChange={(e) => set("opt_in", e.target.checked)} /></label>
              <label className="switch" htmlFor="f-give"><span><b>Enter the speaker giveaway</b><span>Top Combine Score in each age group wins. Needs an email.</span></span><input type="checkbox" id="f-give" checked={d.giveaway} onChange={(e) => set("giveaway", e.target.checked)} /></label>
              {d.giveaway && <div className="field"><label htmlFor="f-email">Email</label><input className="input" id="f-email" type="email" inputMode="email" autoComplete="off" placeholder="name@company.com" value={d.email} onChange={(e) => set("email", e.target.value)} /></div>}
            </div>
            <p className="small muted">Before any test, ask: &ldquo;Any injuries, recent surgery, or dizziness today?&rdquo;</p>
          </div>
          <div className="panel">
            <div className="field"><span className="lab">At 85, what do you want to still be doing? <span className="opt">pick up to 3</span></span>
              <div className="chips">{Object.entries(ASPIRE).map(([k, v]) => goalChip(k, v.label))}{goalChip("other", "Something else")}</div>
              {d.aspire.includes("other") && <input className="input other-in" placeholder="In their words: sail, chase grandkids, run a 10K…" value={d.aspire_text} onChange={(e) => set("aspire_text", e.target.value)} autoComplete="off" />}</div>
            <div className="field"><span className="lab">What do you do? <span className="opt">optional</span></span>
              <div className="chips">{Object.entries(ROLES).map(([k, v]) => chip("role", k, v[0]))}</div></div>
          </div>
        </div>
      </div>
      <div className="s-foot"><button className="btn secondary" onClick={onClose}>Cancel</button><button className="btn" disabled={!ok || busy} onClick={submit}>{busy ? "Saving…" : "Start testing"}</button></div>
    </div>
  );
}

function Echo({ t, v }: { t: TestId; v: Visitor }) {
  const val = v.scores[t]; if (val == null) return null;
  const tr = tierOf(percentile(t, v.age, v.sex, val)!);
  return <>{t === "wallsit" ? `${fmt(t, val)}${val >= 120 ? " · 2:00 Club" : ""}` : null}<span className={`pill ${tr}`}>{TIER[tr]}</span></>;
}

function ScoresStep({ v, onScores, onClose, onNext }: { v: Visitor; onScores: (s: Scores, f?: Floor | null) => void; onClose: () => void; onNext: () => void }) {
  const [raw, setRaw] = useState<Record<string, string>>(() => Object.fromEntries(ORDER.map((t) => [t, v.scores[t] != null ? String(v.scores[t]) : ""])));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const fl: Floor = v.floor_detail || { dn: 0, dw: 0, un: 0, uw: 0 };
  const setNum = (t: TestId, s: string) => {
    setRaw((x) => ({ ...x, [t]: s }));
    const n = Number(s.replace(",", ".")), scores = { ...v.scores };
    if (s.trim() === "" || isNaN(n)) delete scores[t]; else scores[t] = clampScore(t, n);
    onScores(scores);
  };
  const tap = (k: keyof Floor | "clear" | "perfect", dlt = 0) => {
    const scores = { ...v.scores };
    if (k === "clear") { delete scores.floor; onScores(scores, null); return; }
    const f = k === "perfect" ? { dn: 0, dw: 0, un: 0, uw: 0 } : { ...fl, [k]: Math.max(0, Math.min(5, fl[k] + dlt)) };
    scores.floor = Math.max(0, 10 - f.dn - f.un - 0.5 * (f.dw + f.uw)); onScores(scores, f);
  };
  const ctl = (k: keyof Floor, l: string) => <div className="fctl"><span>{l}</span><div className="step"><button type="button" onClick={() => tap(k, -1)} aria-label={`One fewer: ${l}`}>−</button><b className="num">{fl[k]}</b><button type="button" onClick={() => tap(k, 1)} aria-label={`One more: ${l}`}>+</button></div></div>;
  const nums: TestId[] = ["grip", "balance", "wallsit", "pushups"];
  return (
    <div className="sheet-in"><Steps at={1} onClose={onClose} />
      <div className="s-body">
        <div><h2 className="s-title" id="s-title">{v.name}</h2><p className="muted">{v.sex === "F" ? "Female" : "Male"}, {v.age}. Leave a test blank if they skip it.</p></div>
        <div className="entries">
          {nums.map((t, i) => (
            <div className="entry" key={t}><div className="l"><label htmlFor={`in-${t}`}>{TESTS[t].name}</label><span className="hint">{TESTS[t].hint}</span></div>
              <div className="r"><div className="unit-in"><input ref={(el) => { refs.current[i] = el; }} className="input num" id={`in-${t}`} inputMode={TESTS[t].mode} enterKeyHint="next" autoComplete="off" placeholder="–" autoFocus={i === 0}
                value={raw[t]} onChange={(e) => setNum(t, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const n = refs.current[i + 1]; if (n) n.focus(); else e.currentTarget.blur(); } }} /><span>{TESTS[t].unit}</span></div>
                <span className="echo"><Echo t={t} v={v} /></span></div></div>
          ))}
          <div className="entry floor"><div className="l"><span className="lab">Floor rise</span><span className="hint">Sit down to the floor and stand back up, no hands if possible.</span></div>
            <div className="rule"><b>How to score</b><ul><li>Start at 10: 5 for sitting down, 5 for standing up.</li><li>Take off 1 each time they put down a hand, knee, forearm, or the side of a leg.</li><li>Take off ½ for a clear wobble. Crossed legs are fine.</li></ul></div>
            <div className="fgrid">
              <div className="fcol"><p className="eyebrow">Sitting down</p>{ctl("dn", "Supports")}{ctl("dw", "Wobbles")}</div>
              <div className="fcol"><p className="eyebrow">Standing up</p>{ctl("un", "Supports")}{ctl("uw", "Wobbles")}</div>
              <div className="fscore"><span className="v num">{v.scores.floor != null ? fmt("floor", v.scores.floor) : "–"}</span><span className="small muted">of 10</span>
                {v.scores.floor != null ? <button type="button" className="textlink small" onClick={() => tap("clear")}>Clear</button> : <button type="button" className="textlink small" onClick={() => tap("perfect")}>Clean 10</button>}</div>
            </div></div>
        </div>
      </div>
      <div className="s-foot"><button className="btn secondary" onClick={onClose}>Save and close</button><button className="btn" disabled={!Object.keys(v.scores).length} onClick={onNext}>See results</button></div>
    </div>
  );
}

function ResultsStep({ v, onEdit, onClose, onEmail }: { v: Visitor; onEdit: () => void; onClose: () => void; onEmail: (e: string, quiet?: boolean) => void }) {
  const [qr, setQr] = useState(""); const [email, setEmail] = useState(v.email || "");
  const url = `${SITE}/r/${v.code}`;
  useEffect(() => { QRCode.toDataURL(url, { width: 480, margin: 1, color: { dark: "#0F4258", light: "#FFFFFF" } }).then(setQr); }, [url]);
  useEffect(() => { if (v.email) onEmail(v.email, true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const p = { age: v.age, sex: v.sex, scores: v.scores };
  return (
    <div className="sheet-in"><Steps at={2} onClose={onClose} />
      <div className="s-body">
        <div className="res-top"><div><p className="eyebrow">Show {v.name.split(" ")[0]}</p><h2 className="s-title" id="s-title">How you stack up for your age</h2></div></div>
        <div className="cols">
          <div className="panel"><div className="rlist">{ORDER.map((t) => { const val = v.scores[t]; if (val == null) return <div key={t} className="rline skip"><span className="t">{TESTS[t].short}</span><span className="v">Skipped</span><span /></div>;
            const tr = tierOf(percentile(t, v.age, v.sex, val)!); return <div key={t} className="rline"><span className="t">{TESTS[t].short}</span><span className="v num">{fmt(t, val)}<small>{unitOf(t)}</small></span><span className={`pill ${tr}`}>{TIER[tr]}</span></div>; })}</div>
            {isFull(p) ? <div className="cstrip"><span><b>All five done.</b><br /><span className="small">Combine Score, out of 500</span></span><span className="v num">{combine(p)}</span></div> : <p className="small muted">Do all five to get a Combine Score and a spot on the Combine board.</p>}</div>
          <div className="panel">
            <div className="share"><div className="qr">{qr && <img src={qr} alt={`QR code for ${v.name}'s report`} />}</div>
              <div className="txt"><h3>Scan for your full report</h3><p className="small muted">This code is unique to {v.name.split(" ")[0]}. An email entered on their phone links back to this visit.</p>
                <a className="textlink" href={`/r/${v.code}`} target="_blank" rel="noopener">Open their report</a></div></div>
            <p className="or">or add their email</p>
            <form className="inline-send" onSubmit={(e) => { e.preventDefault(); if (emailOk(email)) onEmail(email.trim()); }}>
              <input className="input" type="email" inputMode="email" autoComplete="off" aria-label="Email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="btn" disabled={!emailOk(email)}>Save</button></form>
          </div>
        </div>
      </div>
      <div className="s-foot"><button className="btn secondary" onClick={onEdit}>Edit scores</button><button className="btn" onClick={onClose}>Done</button></div>
    </div>
  );
}
