"use client";
import { useEffect, useState } from "react";
import { ORDER, TESTS, TIER, fmt, movementAge, pointsOf, tierOf, unitOf, valueAt, type Scores, type Sex, type TestId, type Tier } from "@/lib/norms";
import { ASPIRE, CLIN, HABITS, NOUN, WHAT, PARTNER_EMAIL } from "@/lib/copy";
import { Logo } from "@/app/ui";

type Data = { first: string; name: string; age: number; sex: Sex; aspire: string | null; aspire_text: string | null; role: string | null; company: string | null; interest: string | null; unlocked: boolean; scores: Scores | null;
  standing: { group: string; rank: number; total: number; score: number; top: { rank: number; name: string; score: number; me: boolean }[] } | null };
const TIERS: Tier[] = ["building", "solid", "strong", "elite"], BOUNDS = [0, 25, 75, 90, 100];
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const listJoin = (a: string[]) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);

const PanelLines = () => (
  <svg className="lines" viewBox="0 0 600 400" preserveAspectRatio="none" aria-hidden="true">
    <path d="M380 -10 C 440 80, 520 60, 610 140" fill="none" stroke="#B2EBF0" strokeOpacity="0.3" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M410 -10 C 470 70, 540 70, 610 110" fill="none" stroke="#B2EBF0" strokeOpacity="0.15" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const WaveLine = () => (
  <svg className="wave" viewBox="0 0 720 28" preserveAspectRatio="none" aria-hidden="true"><path d="M0 18 C 120 4, 220 26, 360 14 S 600 2, 720 14" fill="none" strokeWidth="2" strokeLinecap="round" /></svg>
);
const Idea = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></svg>
);
const ICON: Record<TestId, string> = {
  balance: "M12 2.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 7v7m0 0-2 7m2-7 3 2M6 10h12",
  wallsit: "M9 2.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM9 7v6h6v7M4 3v18",
  grip: "M6 8h12l-1 12H7zM9 8V6a3 3 0 0 1 6 0v2",
  pushups: "M18 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM3 15l12-4 2 6M15 11v6M2 20h20",
  floor: "M8 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 11v4l5 2v3M8 15l-3 5M2 21h20",
};

function Copy({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return <button className="copy2" onClick={() => { navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }, () => {}); }}>{done ? "Copied" : label}</button>;
}

export default function Report({ code }: { code: string }) {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ email: "", company: "", title: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!d?.standing) return;
    const h = setInterval(() => { if (document.visibilityState === "visible") fetch(`/api/r/${code}`, { cache: "no-store" }).then((r) => r.ok && r.json()).then((j) => j && setD(j)).catch(() => {}); }, 30000);
    return () => clearInterval(h);
  }, [code, !!d?.standing]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetch(`/api/r/${code}`, { cache: "no-store" }).then(async (r) => { const j = await r.json(); if (r.ok) setD(j); else setErr(j.error); }).catch(() => setErr("Couldn't load your report. Check your connection and refresh.")); }, [code]);

  const top = <div className="rp-top"><Logo /><span className="meta">Longevity Combine · HLTH 2026</span></div>;
  if (err) return <div className="rp-gate gutter">{top}<div className="gate2"><PanelLines /><h1>{err}</h1><p>Ask anyone in a Groove jacket at the booth and we'll find it.</p></div></div>;
  if (!d) return <div className="rp-gate gutter">{top}<p className="muted">Loading your results…</p></div>;
  const who = d.sex === "F" ? "women" : "men", whoOne = d.sex === "F" ? "woman" : "man";

  if (!d.unlocked || !d.scores) return (
    <div className="rp-gate gutter">{top}
      <form className="gate2" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setErr("");
          const r = await fetch(`/api/r/${code}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) }); const j = await r.json();
          setBusy(false); if (r.ok) { setD(j); window.scrollTo(0, 0); } else setErr(j.error); }}>
        <PanelLines /><span className="ov">Your results are ready</span>
        <h1>{d.first}, here&rsquo;s how you compare with {who} your age.</h1>
        <ul><li>Your movement age, from all of your tests</li><li>What your goal for your 80s will take</li><li>Small daily habits built around your results</li></ul>
        <div className="field"><label htmlFor="g-email">Email</label><input className="input" id="g-email" type="email" inputMode="email" required autoComplete="email" placeholder="name@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="row2"><div className="field"><label htmlFor="g-co">Company <span className="opt">optional</span></label><input className="input" id="g-co" autoComplete="organization" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div className="field"><label htmlFor="g-title">Title <span className="opt">optional</span></label><input className="input" id="g-title" autoComplete="organization-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div></div>
        <button className="btn" disabled={busy}>{busy ? "Opening…" : "See my results"}</button>
        <p className="fine">We&rsquo;ll email you a copy and occasional updates from Groove. Unsubscribe anytime.</p>
      </form></div>
  );

  const p = { age: d.age, sex: d.sex, scores: d.scores }, pts = pointsOf(p) as Record<TestId, number>, done = ORDER.filter((t) => d.scores![t] != null);
  if (!done.length) return <div className="rp-gate gutter">{top}<div className="gate2"><PanelLines /><h1>No scores yet.</h1><p>Finish a test at the booth and this page fills in.</p></div></div>;
  const u = (t: TestId) => (unitOf(t) ? " " + unitOf(t) : "");
  const sorted = done.slice().sort((a, c) => pts[c] - pts[a]), best = sorted[0], low = sorted[sorted.length - 1];
  const avgAll = Math.round(done.reduce((a, t) => a + pts[t], 0) / done.length);
  const headline = done.length > 1 && pts[best] - pts[low] >= 15 ? `Your ${NOUN[best]} is ahead of your age. ${cap(NOUN[low])} is where to focus.`
    : avgAll >= 65 ? `You're ahead of most ${who} your age across the board.` : avgAll >= 40 ? "You're right around typical for your age, with clear room to build." : "You have real room to build, and these measures respond quickly.";
  const mAge = movementAge(p), showAge = d.age >= 45 && done.length >= 3, diff = d.age - mAge;
  const markPos = (pc: number) => { const i = TIERS.indexOf(tierOf(pc)); return (i + (pc - BOUNDS[i]) / (BOUNDS[i + 1] - BOUNDS[i])) * 25; };

  const notes: string[] = [];
  if (d.scores.grip != null) { const c = d.sex === "F" ? 16 : 27, g = d.scores.grip; notes.push(g >= c + 6 ? `Your grip is well clear of the <b>${c} kg</b> low-strength line clinicians use. Grip is one of the most predictive single measures of healthy aging.` : g >= c ? `Your grip is just above the <b>${c} kg</b> low-strength line. Worth building a buffer, since grip declines steadily after 50.` : `Your grip is below the <b>${c} kg</b> low-strength line clinicians use. Worth raising with your doctor, and it responds well to training.`); }
  if (d.scores.floor != null) notes.push(d.scores.floor >= 8 ? `A floor rise of <b>${fmt("floor", d.scores.floor)}</b> puts you in the lowest-risk band (8 to 10) in the research on this test.` : `A floor rise of <b>${fmt("floor", d.scores.floor)}</b>. Getting to 8 or above is the goal: that band carries the lowest risk in the research on this test.`);
  if (d.scores.balance != null && pts.balance < 50) notes.push("Eyes-closed balance falls fastest of anything we tested, and it's also the quickest to come back with daily practice.");

  const gKeys = (d.aspire || "").split(",").filter(Boolean), presets = gKeys.filter((k) => ASPIRE[k]);
  const goals: { label: string; takes?: string }[] = [...presets.map((k) => ({ label: ASPIRE[k].label, takes: ASPIRE[k].takes })), ...(gKeys.includes("other") && d.aspire_text ? [{ label: d.aspire_text }] : [])];
  const fromGoals = [...new Set(presets.flatMap((k) => ASPIRE[k].tests))].filter((t) => d.scores![t] != null).slice(0, 3);
  const gTests = fromGoals.length ? fromGoals : sorted.slice().reverse().slice(0, 2);
  const prio = [...new Set([low, ...gTests, ...sorted.slice().reverse()])].filter((t) => pts[t] < 90).slice(0, 3);
  const habits = prio.length ? prio : [low];
  const retest = new Date(Date.now() + 28 * 864e5).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <article className="rp gutter">{top}
      <section className="hero2"><span className="ov">{d.first}&rsquo;s results</span><h1>{headline}</h1><span className="who">{d.sex === "F" ? "Female" : "Male"}, {d.age} · compared with {who} your age</span>
        <svg className="lines" viewBox="0 0 600 70" preserveAspectRatio="none" aria-hidden="true"><path d="M-10 50 C 120 10, 230 70, 360 38 S 560 12, 620 30" fill="none" stroke="#B2EBF0" strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round" /><path d="M-10 64 C 140 30, 260 80, 400 52 S 580 32, 620 44" fill="none" stroke="#B2EBF0" strokeOpacity="0.22" strokeWidth="2" strokeLinecap="round" /></svg>
        {showAge ? <div className="age-band"><span className="n num">{mAge}</span><span className="l"><b>Movement age</b><span>Your results match a typical {whoOne} of {mAge}{diff >= 3 ? `, ${diff} years younger than you` : diff <= -3 ? ". These numbers move quickly with training" : ", right in line with your age"}.</span></span></div> : <div style={{ height: 22 }} />}
      </section>

      <section className="sec"><div className="sec-head"><span className="ov">How you compare</span><h2>Test by test, against {who} your age.</h2></div>
        <div className="cmp-list">{done.map((t) => { const pc = pts[t], tr = tierOf(pc), ti = TIERS.indexOf(tr); return (
          <div className="cmp-card" key={t}><div className="cmp-top"><h3>{TESTS[t].name}</h3><span className="res">{fmt(t, d.scores![t])}<small>{unitOf(t)}</small></span></div>
            <div className="ladder" role="img" aria-label={`${TIER[tr]} for your age, ${pc}th percentile`}>{TIERS.map((x, i) => <span key={x} className={`seg ${i <= ti ? "on" : ""} ${i <= ti && tr === "elite" ? "elite" : ""}`} />)}<span className="mk" style={{ left: `${markPos(pc)}%` }} /></div>
            <div className="ladder-l">{TIERS.map((x) => <span key={x} className={x === tr ? "on" : ""}>{TIER[x]}</span>)}</div>
            <p className="cmp-say">{pc >= 50 ? <>Ahead of <b>{pc}%</b> of {who} your age.</> : <>Typical for {who} your age is <b>{fmt(t, valueAt(t, d.age, d.sex, 50))}{u(t)}</b>.</>}</p></div>); })}</div>
        {notes.length > 0 && <div className="notes">{notes.map((n, i) => <div className="note" key={i}><span style={{ color: "var(--ink)" }}><Idea /></span><p dangerouslySetInnerHTML={{ __html: n }} /></div>)}</div>}
      </section>
      <WaveLine />

      <section className="sec"><div className="sec-head"><span className="ov">Your goal for your 80s</span><h2>What it will take, and where you&rsquo;re headed.</h2></div>
        <div className="goal"><div className="goal-h">{goals.length <= 1
            ? <><span className="q">{goals[0] ? cap(goals[0].label) : "Stay strong and independent"} at 85.</span><span className="takes">{goals[0]?.takes ?? "We looked at the two measures with the most room to grow."}</span></>
            : <><span className="gl-k">At 85, you want to</span><ul className="gl">{goals.map((g) => <li key={g.label}><b>{cap(g.label)}</b>{g.takes ? <span>{g.takes}</span> : null}</li>)}</ul></>}</div>
          <div className="proj head"><span>What it takes</span><span>You today</span><span>At 85, aging like most</span></div>
          {gTests.map((t) => <div className="proj" key={t}><span className="t">{TESTS[t].short}<span>{WHAT[t]}</span></span><span className="v now num">{fmt(t, d.scores![t])}{u(t)}</span><span className="v fut num">{fmt(t, valueAt(t, 85, d.sex, pts[t]))}{u(t)}</span></div>)}
          <div className="goal-f">Most people lose strength and balance every decade after 50. That isn&rsquo;t fixed: the habits below are chosen to bend that line for your {listJoin(gTests.map((t) => NOUN[t]))}.</div></div></section>
      <WaveLine />

      <section className="sec"><div className="sec-head"><span className="ov">What to do next</span><h2>Small habits that move the needle.</h2>
          <p>No gym and no schedule. Each one fits into something you already do, and each targets the results that matter most for your goal.</p></div>
        <div className="habits">{habits.map((t) => { const h = HABITS[t]; return (
          <div className="habit" key={t}><div className="habit-top"><span className="habit-ic" style={{ color: "var(--ink)" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICON[t]} /></svg></span><div><span className="for">For your {NOUN[t]}</span><h3>{h.title}</h3></div></div>
            <div className="when">{h.when.map((w) => <span key={w}>{w}</span>)}</div><p className="do">{h.dose[tierOf(pts[t])]}</p><p className="why"><b>Why it works.</b> {h.why}</p></div>); })}</div>
        <div className="retest"><span className="d">{retest}</span><span><b>Re-test in four weeks.</b><span className="muted small">Repeat your weakest test at home and compare. Most people see a change.</span></span></div>
        <p className="fine2">General guidance, not a medical prescription. If you have a health condition, check with your clinician first.</p></section>

      {d.standing && <Standing st={d.standing} />}
      <section className="sec"><div className="sec-head"><span className="ov">The detail</span><h2>Your numbers and the research behind them.</h2></div>
        <div className="det">{done.map((t) => (
          <details key={t}><summary><span className="nm">{TESTS[t].name}</span><span className="rv num">{fmt(t, d.scores![t])}{u(t)}</span><span className="chev" aria-hidden="true">›</span></summary>
            <div className="body"><div className="refs"><div><span>You</span><b>{fmt(t, d.scores![t])}{u(t)}</b></div><div><span>Typical</span><b>{fmt(t, valueAt(t, d.age, d.sex, 50))}{u(t)}</b></div><div><span>Top 10%</span><b>{fmt(t, valueAt(t, d.age, d.sex, 90))}{u(t)}</b></div></div>
              <p className="clin">{CLIN[t](d.sex)}</p></div></details>))}</div>
        <p className="fine2">Typical is the median and top 10% the 90th percentile for {who} your age in published norms. Balance, floor rise and wall sit norms are approximate.</p></section>

      <section className="gv"><PanelLines /><span className="ov">About Groove</span><h2>The care that comes after the diagnosis.</h2>
        <p>Groove gives older adults with osteoporosis, osteopenia, sarcopenia and arthritis a dedicated physical therapist and physician, at home. Members get a plan built from measures like the ones you just did, and their PT adjusts it as they progress.</p>
        <div className="gv-facts"><div><b>Covered by Medicare</b><span>Billed through remote therapeutic monitoring. Live in California.</span></div><div><b>PT plus physician</b><span>Licensed clinicians lead every plan.</span></div>
          <div><b>Measured progress</b><span>Strength, balance and function tracked over time.</span></div><div><b>Between visits</b><span>Ongoing care after the appointment ends.</span></div></div></section>
      <Paths code={code} d={d} onUpdate={setD} />
    </article>
  );
}

/* Follow-up paths, tailored to what they told us they do */
function Paths({ code, d, onUpdate }: { code: string; d: Data; onUpdate: (d: Data) => void }) {
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const kind = d.role === "investor" ? "investor" : d.role === "press" ? "press" : ["plan", "group", "system"].includes(d.role || "") ? "partner" : null;
  const at = d.company ? ` at ${d.company}` : "";
  const ask = async (interest: string) => {
    setBusy(true); setErr("");
    const r = await fetch(`/api/r/${code}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ interest }) });
    setBusy(false); if (r.ok) onUpdate(await r.json()); else setErr("Couldn't send that. Try again, or email us below.");
  };
  const subject = encodeURIComponent(`Groove + ${d.company || "HLTH"}`), body = encodeURIComponent(`Hi Patrick,\n\nWe met at the Longevity Combine at HLTH. I'd like to talk about Groove${at}.\n\n${d.name}`);
  const CARD = {
    partner: { ov: "Plans, medical groups, health systems", h: `Bring Groove to your members${at}`, p: "We'll set up 20 minutes with our CEO on how Groove fits your population: who qualifies, how billing works, and what members see.", btn: "Have Groove reach out", done: "Thanks. Patrick will email you within a couple of days." },
    investor: { ov: "Investors", h: "Follow how Groove is growing", p: "We share a short update on members, outcomes and payer progress. Happy to talk if it's a fit.", btn: "Keep me posted", done: "Thanks. You're on the list, and Patrick will be in touch." },
    press: { ov: "Press", h: "Talk with the Groove team", p: "Interviews, data from the Combine, and member stories with consent.", btn: "Request an interview", done: "Thanks. Our team will reach out shortly." },
  } as const;
  const main = kind ? CARD[kind] : null, done = !!d.interest;
  const contact = <div className="act"><a className="addr" href={`mailto:${PARTNER_EMAIL}?subject=${subject}&body=${body}`}>{PARTNER_EMAIL}</a><Copy text={PARTNER_EMAIL} label="Copy email" /></div>;
  const refer = <div className="path"><span className="ov">A parent or patient 65+</span><h3>See if they&rsquo;re eligible</h3><p className="muted small">Groove is covered by Medicare for adults with osteoporosis, osteopenia, sarcopenia or arthritis. A two-minute check at groovehealth.com.</p>
    <div className="act"><a className="btn-sm" href="https://groovehealth.com" target="_blank" rel="noopener">Check eligibility</a><Copy text="https://groovehealth.com" label="Copy link" /></div></div>;
  const partnerSmall = <div className="path"><span className="ov">Work with us</span><h3>Plans, medical groups and health systems</h3><p className="muted small">Talk with our CEO about bringing Groove to your members.</p>
    {done ? <p className="ok">Thanks. Patrick will email you within a couple of days.</p> : <div className="act"><button className="btn-sm" disabled={busy} onClick={() => ask("partner")}>Have Groove reach out</button></div>}{contact}</div>;
  return (
    <section className="paths">
      {main ? <div className="path main"><span className="ov">{main.ov}</span><h3>{main.h}</h3><p className="muted small">{main.p}</p>
          {done ? <p className="ok">{main.done}</p> : <div className="act"><button className="btn-sm" disabled={busy} onClick={() => ask(kind!)}>{busy ? "Sending…" : main.btn}</button></div>}
          {err && <p className="small" role="alert">{err}</p>}<span className="or-line small muted">Or email us directly</span>{contact}</div>
        : partnerSmall}
      {refer}
    </section>
  );
}

function Standing({ st }: { st: NonNullable<Data["standing"]> }) {
  const inTop = st.rank <= 2;
  return (
    <section className="sec"><div className="sec-head"><span className="ov">The leaderboard</span><h2>{inTop ? `You're #${st.rank} on the board.` : `You're #${st.rank} of ${st.total} so far.`}</h2>
        <p>You finished all five, so you&rsquo;re ranked in {st.group.toLowerCase()} by Combine Score: each test scores up to 100 against people your age and sex. This updates live through the end of HLTH.</p></div>
      <div className="board-mini" aria-live="polite"><div className="bm-head"><span>{st.group}</span><span className="small">{st.total} {st.total === 1 ? "finisher" : "finishers"}</span></div>
        {st.top.map((r) => <div key={r.rank} className={`bm-row ${r.rank === 1 ? "first" : ""} ${r.me ? "me" : ""}`}><span className="rk">{r.rank}</span><span className="nm">{r.me ? "You" : r.name}</span><span className="sc num">{r.score}</span></div>)}
        {!inTop && <><div className="bm-gap" aria-hidden="true">···</div><div className="bm-row me"><span className="rk">{st.rank}</span><span className="nm">You</span><span className="sc num">{st.score}</span></div></>}
      </div></section>
  );
}
