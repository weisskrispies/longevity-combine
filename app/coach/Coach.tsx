"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { ORDER, TESTS, TIER, displayName, tierFor, fmt, isFull, percentile, tierOf, unitOf, combine, clampScore, type Scores, type Sex, type TestId } from "@/lib/norms";
import { ASPIRE, ROLES } from "@/lib/copy";
import { Logo, Waves, useToast } from "@/app/ui";
import { WAIVER } from "@/lib/waiver";

type Floor = { dn: number; dw: number; un: number; uw: number };
type Visitor = { id: string; code: string; name: string; age: number; sex: Sex; opt_in: boolean; giveaway: boolean; email: string | null; aspire: string | null; aspire_text: string | null; role: string | null; scores: Scores; floor_detail: Floor | null; waiver_id?: string | null; email_results?: boolean };
type Signed = { id: string; signed_name: string; consent_leaderboard: boolean; consent_media: boolean; consent_email: boolean; consent_giveaway?: boolean; email: string | null };
type Mode = "home" | "visitor" | "scores" | "results" | "playbook";
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
  const [wv, setWv] = useState(false);
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

  const flushing = useRef(false);
  const flush = useCallback(async () => {
    if (flushing.current) return; // one flush at a time, so a queued save is never sent twice
    flushing.current = true;
    try {
    const queue = loadQ(); const ids = Object.keys(queue); setPending(ids.length);
    for (const id of ids) {
      try { const r = await fetch(`/api/coach/visitors/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(queue[id]) });
        if (r.ok || r.status === 400 || r.status === 403) { const nq = loadQ(); delete nq[id]; saveQ(nq); } } catch { /* stay queued */ }
    }
    setPending(Object.keys(loadQ()).length);
    } finally { flushing.current = false; }
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
          <div className="c-top">
            <section className="c-hero"><Waves />
              <span className="ov">Next visitor</span>
              <h1>Who&rsquo;s stepping up?</h1>
              <p>Name, age and sex, then scores as they finish each test.</p>
              <button className="btn gold" onClick={() => setMode("visitor")}>Set up new visitor</button>
            </section>
            <section className="c-tips">
              <span className="eyebrow">On the floor</span>
              <ul>
                <li><b>Open with grip.</b> &ldquo;Want to see how your grip stacks up for your age?&rdquo;</li>
                <li><b>Pivot after the score.</b> &ldquo;These are the measures our PTs track with Medicare members. Who do you work with?&rdquo;</li>
                <li><b>Safety first.</b> Ask about injuries or dizziness. Spot every balance and floor test.</li>
              </ul>
              <button className="btn secondary" onClick={() => setMode("playbook")}>Full playbook</button>
            </section>
          </div>
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
          {mode === "playbook" && <Playbook onClose={() => setMode("home")} />}
          {mode === "visitor" && <VisitorStep onClose={close} onCreated={(v) => { setCur(v); setMode("scores"); }} show={show} />}
          {mode === "scores" && cur && <ScoresStep v={cur} onSign={() => setWv(true)} onScores={updateScores} onClose={() => { show("Saved. Search their name to pick up where you left off."); close(); }} onNext={() => setMode("results")} />}
          {mode === "results" && cur && <ResultsStep v={cur} onEdit={() => setMode("scores")} onClose={close} onEmail={(email, quiet) => { const v = { ...cur, email }; setCur(v); queuePatch(v, { email }); if (!quiet) show(`Saved. ${cur.name.split(" ")[0]}'s results are on their way to ${email}.`); }}
            onOptIn={(o) => { const v = { ...cur, ...o, email: o.email || cur.email }; setCur(v); queuePatch(v, o); show("Saved."); }} />}
          {wv && cur && <WaiverModal forName={cur.name} visitorId={cur.id} onClose={() => setWv(false)} show={show} onSigned={(w) => {
            setCur({ ...cur, waiver_id: w.id, opt_in: w.consent_leaderboard, giveaway: cur.giveaway || !!w.consent_giveaway, email_results: w.consent_email, email: cur.email || w.email }); setWv(false); show("Signed. All five tests are open.");
          }} />}
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

function WaiverModal({ forName, visitorId, onClose, onSigned, show }: { forName?: string; visitorId?: string; onClose: () => void; onSigned: (w: Signed) => void; show: (m: string) => void }) {
  const [agreed, setAgreed] = useState(false), [name, setName] = useState(""), [lb, setLb] = useState(false), [media, setMedia] = useState(false), [give, setGive] = useState(false), [mail, setMail] = useState(false), [email, setEmail] = useState("");
  const needEmail = give || mail;
  const [busy, setBusy] = useState(false);
  const full = name.trim().split(/\s+/).length >= 2, ok = agreed && full && (!needEmail || emailOk(email.trim()));
  const submit = async () => {
    if (!ok || busy) return; setBusy(true);
    try {
      const r = await fetch("/api/coach/waivers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ version: WAIVER.version, agreed, name, consent_leaderboard: lb, consent_media: media, consent_email: mail, consent_giveaway: give, email: needEmail ? email.trim() : null, visitor_id: visitorId }) });
      const j = await r.json().catch(() => ({}));
      if (j.reload) { show(j.error); setTimeout(() => location.reload(), 1200); return; }
      if (!r.ok) throw new Error(j.error); onSigned(j.waiver);
    } catch (e) { show(e instanceof Error && e.message ? e.message : "Couldn't save. Check the WiFi and try again."); } finally { setBusy(false); }
  };
  const box = (id: string, on: boolean, set: (b: boolean) => void, label: React.ReactNode, req = false) => (
    <label className={`wv-check ${req ? "req" : ""}`} htmlFor={id}><input type="checkbox" id={id} checked={on} onChange={(e) => set(e.target.checked)} /><span>{label}</span></label>
  );
  return (
    <div className="wv-modal" role="dialog" aria-modal="true" aria-labelledby="wv-title"><div className="sheet-in wv">
      <div className="wv-head"><div><p className="eyebrow">Before you start</p><h2 id="wv-title">Read and sign the release</h2></div>
        <button className="x" onClick={onClose} aria-label="Close waiver">×</button></div>
      <div className="wv-body">
        <div className="wv-text" tabIndex={0} role="document" aria-label="Release and waiver text">{WAIVER.text.split(/\n\n+/).map((para, i) => <p key={i}>{para}</p>)}</div>
        <div className="wv-form">
          <div className="field"><label htmlFor="wv-name">Type your full name</label><input className="input wv-name" id="wv-name" autoComplete="off" autoCapitalize="words" autoCorrect="off" spellCheck={false} enterKeyHint="done" placeholder={forName?.includes(" ") ? forName : "First and last name"} value={name} onChange={(e) => setName(e.target.value)} /></div>
          {box("wv-agree", agreed, setAgreed, <b>I have read and agree to the release</b>, true)}
          <p className="wv-opt">Optional</p>
          {box("wv-give", give, setGive, "Opt in to win a speaker")}
          {box("wv-mail", mail, setMail, "Opt in to get my results")}
          {needEmail && <input className="input wv-email" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" aria-label="Your email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />}
          {box("wv-lb", lb, setLb, "Show my first name and last initial on the leaderboard")}
          {box("wv-media", media, setMedia, "Use photos or video of me for Groove social and ads")}
        </div>
      </div>
      <div className="s-foot"><button className="btn secondary" onClick={onClose}>Skip for now</button><button className="btn wv-go" disabled={!ok || busy} onClick={submit}>{busy ? "Saving…" : "Sign"}</button></div>
    </div></div>
  );
}

function VisitorStep({ onClose, onCreated, show }: { onClose: () => void; onCreated: (v: Visitor) => void; show: (m: string) => void }) {
  const [waiver, setWaiver] = useState<Signed | null>(null), [wOpen, setWOpen] = useState(true);
  const [d, setD] = useState({ first: "", last: "", age: "", sex: "", opt_in: true, giveaway: false, email: "", aspire: [] as string[], aspire_text: "", role: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: unknown) => setD((x) => ({ ...x, [k]: v }));
  const age = Number(d.age), ok = d.first.trim() && age >= 18 && age <= 105 && d.sex && (!d.giveaway || emailOk(d.email));
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
      const r = await fetch("/api/coach/visitors", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...d, waiver_id: waiver?.id, name: `${d.first.trim()} ${d.last.trim()}`.trim(), age, email: d.giveaway ? d.email : null, aspire: d.aspire.join(",") || null, aspire_text: d.aspire.includes("other") ? d.aspire_text : null, role: d.role || null }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error); onCreated(j.visitor);
    } catch (e) { show(e instanceof Error && e.message ? e.message : "Couldn't save. Check the WiFi and try again."); } finally { setBusy(false); }
  };
  return (
    <div className="sheet-in"><Steps at={0} onClose={onClose} />
      <div className="s-body"><h2 className="s-title" id="s-title">Who's stepping up?</h2>
        <div className="cols">
          <div className="panel">
            <div className="grid2">
              <div className="field"><label htmlFor="f-name">First name</label><input className="input" id="f-name" autoFocus autoComplete="off" autoCapitalize="words" enterKeyHint="next" placeholder="Linda" value={d.first} onChange={(e) => set("first", e.target.value)} /></div>
              <div className="field"><label htmlFor="f-last">Last name <span className="opt">optional</span></label><input className="input" id="f-last" autoComplete="off" autoCapitalize="words" enterKeyHint="next" placeholder="Rogers" value={d.last} onChange={(e) => set("last", e.target.value)} /></div>
            </div>
            <div className="grid2">
              <div className="field"><label htmlFor="f-age">Age</label><input className="input num" id="f-age" type="number" inputMode="numeric" min={18} max={105} placeholder="64" value={d.age} onChange={(e) => set("age", e.target.value)} /></div>
              <div className="field"><span className="lab">Sex</span><div className="chips seg">{chip("sex", "F", "Female")}{chip("sex", "M", "Male")}</div></div>
            </div>
            <div>
              <label className="switch" htmlFor="f-opt"><span><b>Show on the leaderboard</b><span>As {d.first.trim() ? displayName(`${d.first} ${d.last}`) : "first name and last initial"}</span></span><input type="checkbox" id="f-opt" checked={d.opt_in} onChange={(e) => set("opt_in", e.target.checked)} /></label>
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
            {waiver
              ? <div className="wv-cta done"><span className="ck" aria-hidden="true">✓</span><span><b>Waiver signed by {waiver.signed_name}</b><span>{[waiver.consent_leaderboard ? "Leaderboard OK" : "No leaderboard", waiver.consent_media ? "photos OK" : "no photos", waiver.consent_giveaway ? "speaker giveaway" : "", waiver.consent_email ? "email results" : "no results email"].filter(Boolean).join(" · ")}</span></span></div>
              : <button type="button" className="wv-cta" onClick={() => setWOpen(true)}><span><b>No waiver yet</b><span>Grip only until they sign. Hand them the iPad.</span></span><span className="go">Sign waiver ›</span></button>}
          </div>
        </div>
      </div>
      <div className="s-foot"><button className="btn secondary" onClick={onClose}>Cancel</button><button className="btn" disabled={!ok || busy} onClick={submit}>{busy ? "Saving…" : "Start testing"}</button></div>
      {wOpen && <WaiverModal forName={`${d.first} ${d.last}`.trim()} onClose={() => setWOpen(false)} show={show} onSigned={(w) => {
        setWaiver(w); setWOpen(false);
        setD((x) => ({ ...x, opt_in: w.consent_leaderboard, giveaway: !!w.consent_giveaway, ...(!x.first.trim() ? { first: w.signed_name.split(" ")[0], last: w.signed_name.split(" ").slice(1).join(" ") } : {}), ...(w.email && !x.email ? { email: w.email } : {}) }));
        show("Signed. Thanks! Please hand the iPad back.");
      }} />}
    </div>
  );
}

function Echo({ t, v }: { t: TestId; v: Visitor }) {
  const val = v.scores[t]; if (val == null) return null;
  const tr = tierFor(t, v)!;
  return <>{t === "wallsit" ? `${fmt(t, val)}${val >= 120 ? " · 2:00 Club" : ""}` : null}<span className={`pill ${tr}`}>{TIER[tr]}</span></>;
}

function ScoresStep({ v, onSign, onScores, onClose, onNext }: { v: Visitor; onSign: () => void; onScores: (s: Scores, f?: Floor | null) => void; onClose: () => void; onNext: () => void }) {
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
  const locked = v.waiver_id === null; // null = not signed; undefined = waiver SQL not run yet, so don't lock
  return (
    <div className="sheet-in"><Steps at={1} onClose={onClose} />
      <div className="s-body">
        <div><h2 className="s-title" id="s-title">{v.name}</h2><p className="muted">{v.sex === "F" ? "Female" : "Male"}, {v.age}. Leave a test blank if they skip it.</p></div>
        {locked && <button type="button" className="wv-cta" onClick={onSign}><span><b>Grip is open. The other four need a waiver.</b><span>Hand them the iPad to read and sign.</span></span><span className="go">Sign waiver ›</span></button>}
        <div className="entries">
          {nums.map((t, i) => (
            <div className={`entry ${locked && t !== "grip" ? "locked" : ""}`} key={t}><div className="l"><label htmlFor={`in-${t}`}>{TESTS[t].name}</label><span className="hint">{TESTS[t].hint}</span></div>
              <div className="r"><div className="unit-in"><input ref={(el) => { refs.current[i] = el; }} className="input num" id={`in-${t}`} inputMode={TESTS[t].mode} enterKeyHint="next" autoComplete="off" placeholder="–" autoFocus={i === 0} disabled={locked && t !== "grip"}
                value={raw[t]} onChange={(e) => setNum(t, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const n = refs.current[i + 1]; if (n) n.focus(); else e.currentTarget.blur(); } }} /><span>{TESTS[t].unit}</span></div>
                <span className="echo"><Echo t={t} v={v} /></span></div></div>
          ))}
          <div className={`entry floor ${locked ? "locked" : ""}`} inert={locked || undefined}><div className="l"><span className="lab">Floor rise</span><span className="hint">Sit down to the floor and stand back up, no hands if possible.</span></div>
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

function ResultsStep({ v, onEdit, onClose, onEmail, onOptIn }: { v: Visitor; onEdit: () => void; onClose: () => void; onEmail: (e: string, quiet?: boolean) => void; onOptIn: (o: Partial<Visitor> & { send_results?: boolean }) => void }) {
  const [qr, setQr] = useState(""); const [email, setEmail] = useState(v.email || "");
  // Ask again at the end for anything they skipped.
  const hasResults = v.email_results ?? !!v.email;
  const [ask] = useState(() => ({ lb: !v.opt_in, give: !v.giveaway, mail: !hasResults }));
  const [o, setO] = useState({ lb: false, give: false, mail: false });
  const needEmail = (o.give || o.mail) && !v.email, anyOn = o.lb || o.give || o.mail;
  const okOpt = anyOn && (!needEmail || emailOk(email.trim()));
  const saveOpt = () => {
    if (!okOpt) return;
    onOptIn({ ...(o.lb ? { opt_in: true } : {}), ...(o.give ? { giveaway: true } : {}), ...(o.mail ? { email_results: true } : {}), ...(needEmail ? { email: email.trim() } : o.mail && v.email ? { email: v.email } : {}), send_results: o.mail });
    setO({ lb: false, give: false, mail: false });
  };
  const optRow = (k: "lb" | "give" | "mail", label: string) => ask[k] && (k !== "lb" || !v.opt_in) && (k !== "give" || !v.giveaway) && (k !== "mail" || !(v.email_results ?? false))
    ? <label key={k} className="wv-check sm" htmlFor={`oi-${k}`}><input type="checkbox" id={`oi-${k}`} checked={o[k]} onChange={(e) => setO((x) => ({ ...x, [k]: e.target.checked }))} /><span>{label}</span></label> : null;
  const rows = [optRow("give", "Opt in to win a speaker"), optRow("mail", "Opt in to get my results"), optRow("lb", "Show me on the leaderboard")].filter(Boolean);
  const url = `${SITE}/r/${v.code}`;
  useEffect(() => { QRCode.toDataURL(url, { width: 480, margin: 1, color: { dark: "#0F4258", light: "#FFFFFF" } }).then(setQr); }, [url]);
  useEffect(() => { if (v.email && v.email_results !== false) onEmail(v.email, true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const p = { age: v.age, sex: v.sex, scores: v.scores };
  return (
    <div className="sheet-in"><Steps at={2} onClose={onClose} />
      <div className="s-body">
        <div className="res-top"><div><p className="eyebrow">Show {v.name.split(" ")[0]}</p><h2 className="s-title" id="s-title">How you stack up for your age</h2></div></div>
        <div className="cols">
          <div className="panel"><div className="rlist">{ORDER.map((t) => { const val = v.scores[t]; if (val == null) return <div key={t} className="rline skip"><span className="t">{TESTS[t].short}</span><span className="v">Skipped</span><span /></div>;
            const tr = tierFor(t, v)!; return <div key={t} className="rline"><span className="t">{TESTS[t].short}</span><span className="v num">{fmt(t, val)}<small>{unitOf(t)}</small></span><span className={`pill ${tr}`}>{TIER[tr]}</span></div>; })}</div>
            {isFull(p) ? <div className="cstrip"><span><b>All five done.</b><br /><span className="small">Combine Score, out of 500</span></span><span className="v num">{combine(p)}</span></div> : <p className="small muted">Do all five to get a Combine Score and a spot on the Combine board.</p>}</div>
          <div className="panel">
            <div className="share"><div className="qr">{qr && <img src={qr} alt={`QR code for ${v.name}'s report`} />}</div>
              <div className="txt"><h3>Scan for your full report</h3><p className="small muted">This code is unique to {v.name.split(" ")[0]}. An email entered on their phone links back to this visit.</p>
                <a className="textlink" href={`/r/${v.code}`} target="_blank" rel="noopener">Open their report</a></div></div>
            {rows.length ? <div className="optin"><p className="or">Want in?</p>{rows}
                {needEmail && <input className="input" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" aria-label="Their email" placeholder="Their email" value={email} onChange={(e) => setEmail(e.target.value)} />}
                <button className="btn" disabled={!okOpt} onClick={saveOpt}>Save</button></div>
              : !v.email && <><p className="or">or add their email</p>
              <form className="inline-send" onSubmit={(e) => { e.preventDefault(); if (emailOk(email)) onEmail(email.trim()); }}>
                <input className="input" type="email" inputMode="email" autoComplete="off" aria-label="Email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <button className="btn" disabled={!emailOk(email)}>Save</button></form></>}
          </div>
        </div>
      </div>
      <div className="s-foot"><button className="btn secondary" onClick={onEdit}>Edit scores</button><button className="btn" onClick={onClose}>Done</button></div>
    </div>
  );
}

function Playbook({ onClose }: { onClose: () => void }) {
  return (
    <div className="sheet-in"><div className="s-head"><span /><span className="eyebrow" style={{ textAlign: "center" }}>Floor playbook</span><button className="x" onClick={onClose} aria-label="Close">×</button></div>
      <div className="s-body pb">
        <h2 className="s-title" id="s-title">How to run the Combine</h2>
        <div className="pb-grid">
          <section className="panel"><h3>Pull people in</h3><ul>
            <li>Stand at the aisle edge, never behind the counter. Keep one person mid-test; a test in progress draws a crowd.</li>
            <li>&ldquo;Want to see how your grip stacks up for your age?&rdquo; It takes 30 seconds and it&rsquo;s the easiest yes.</li>
            <li>&ldquo;Most people can&rsquo;t stand on one leg for 10 seconds with their eyes closed. Want to try?&rdquo;</li>
            <li>&ldquo;Two minutes against the wall gets you into the 2:00 Club.&rdquo;</li>
            <li>Point at the board: &ldquo;Your age group has an open spot.&rdquo;</li></ul></section>
          <section className="panel"><h3>Pivot after the score (60 to 90 sec)</h3><ul>
            <li><b>Health plan or medical group:</b> &ldquo;Grip and balance are measures our PTs track for Medicare members with osteoporosis and sarcopenia, billed through RTM. How does your group handle MSK between visits?&rdquo;</li>
            <li><b>Health system:</b> &ldquo;Most of the progress in these conditions happens between appointments. That&rsquo;s the gap we fill. Where do your patients go after a DEXA?&rdquo;</li>
            <li><b>Investor:</b> &ldquo;We&rsquo;re the clinical, Medicare-covered version of this. Happy to show you the retention curve.&rdquo; Then find Patrick.</li>
            <li><b>Press:</b> bring them to Patrick.</li>
            <li><b>Anyone with a parent:</b> hand them the card.</li></ul></section>
          <section className="panel"><h3>Qualify in three questions</h3><ol>
            <li>Who do you work with?</li><li>Do you cover or care for Medicare members?</li><li>Who owns MSK or fall prevention on your side?</li></ol>
            <p className="small muted">Pick their answer under &ldquo;What do you do?&rdquo; in setup. Plans and medical groups get tagged A for follow-up.</p></section>
          <section className="panel"><h3>Safety</h3><ul>
            <li>Before any test: &ldquo;Any injuries, recent surgery, or dizziness today?&rdquo;</li>
            <li>Stand beside them for balance and floor rise, within arm&rsquo;s reach.</li>
            <li>Offer a 10-second eyes-open balance first to anyone hesitant.</li>
            <li>Anyone who hesitates gets a different test. Never push.</li>
            <li>Say &ldquo;below typical for your age,&rdquo; never &ldquo;you have sarcopenia.&rdquo;</li></ul></section>
          <section className="panel"><h3>Scoring quick reference</h3><ul>
            <li><b>Grip:</b> best of 2 per hand, enter the stronger hand.</li>
            <li><b>Balance:</b> arms crossed, eyes closed, best side. Stop at 60 seconds.</li>
            <li><b>Wall sit:</b> thighs parallel. Stop at 2:00 (2:00 Club).</li>
            <li><b>Push-ups:</b> 60 seconds. Men full, women from knees. Chest to a fist.</li>
            <li><b>Floor rise:</b> start at 10. Minus 1 per hand, knee, forearm or side of leg. Minus ½ per wobble.</li></ul></section>
          <section className="panel"><h3>Wrap up</h3><ul>
            <li>Show them their results on the iPad, then the QR code.</li>
            <li>Get an email so their report and plan reach them.</li>
            <li>Bars for anyone who stops, headbands for anyone who tests, band sets for all five.</li></ul></section>
        </div>
      </div>
    </div>
  );
}
