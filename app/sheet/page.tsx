import { ageRows, valueAt, fmt, LOW_GRIP, SOURCES, TESTS, CLUB_SEC, FLOOR_BANDS, type Sex, type TestId } from "@/lib/norms";

export const metadata = { title: "Combine Benchmarks" };

const lab = (a: number, b: number) => (a === 0 ? `18–${b}` : b >= 100 ? `${a}+` : `${a}–${b}`);
const at = (a: number, b: number) => (a === 0 ? b : a);
const v = (t: TestId, age: number, sex: Sex, p: number, eo?: boolean) => fmt(t, valueAt(t, age, sex, p, eo));

/** Typical (50th) and Strong (75th) by age, men and women. */
function SexTable({ t, unit }: { t: TestId; unit: string }) {
  return (
    <table><thead><tr><th>Age</th><th colSpan={2}>Men</th><th colSpan={2}>Women</th></tr>
      <tr className="sub"><th /><th>Typical</th><th>Strong</th><th>Typical</th><th>Strong</th></tr></thead>
      <tbody>{ageRows(t).map(([a, b]) => { const g = at(a, b); return (
        <tr key={a}><td>{lab(a, b)}</td><td>{v(t, g, "M", 50)}{unit}</td><td>{v(t, g, "M", 75)}+</td><td>{v(t, g, "F", 50)}{unit}</td><td>{v(t, g, "F", 75)}+</td></tr>); })}</tbody></table>
  );
}

export default function Sheet() {
  return (
    <main className="sheet-pg">
      <style>{CSS}</style>
      <header><div><img src="/logo-teal.png" alt="groove" /><span>Longevity Combine · HLTH 2026</span></div>
        <h1>How do you compare?</h1>
        <p>Find your age row. <b>Typical</b> is the middle (50th percentile) for your age. <b>Strong</b> is the top 25%. The top 10% is Elite.</p></header>

      <div className="grid">
        <section><h2>Grip strength <em>kg</em></h2><p className="how">{TESTS.grip.hint}</p>
          <SexTable t="grip" unit="" />
          <p className="flag">Low-strength line at any age: under {LOW_GRIP.M} kg (men), {LOW_GRIP.F} kg (women).</p></section>

        <section><h2>One-leg balance <em>seconds</em></h2><p className="how">Arms crossed, best of 3, stop at 45. Men and women score the same.</p>
          <table><thead><tr><th>Age</th><th colSpan={2}>Eyes closed</th><th colSpan={2}>Eyes open</th></tr>
            <tr className="sub"><th /><th>Typical</th><th>Strong</th><th>Typical</th><th>Strong</th></tr></thead>
            <tbody>{ageRows("balance").map(([a, b]) => { const g = at(a, b); return (
              <tr key={a}><td>{lab(a, b)}</td><td>{v("balance", g, "F", 50)}</td><td>{v("balance", g, "F", 75)}+</td><td>{v("balance", g, "F", 50, true)}</td><td>{v("balance", g, "F", 75, true)}{valueAt("balance", g, "F", 75, true) >= 45 ? "" : "+"}</td></tr>); })}</tbody></table></section>

        <section><h2>Push-ups <em>reps</em></h2><p className="how">{TESTS.pushups.hint}</p>
          <SexTable t="pushups" unit="" />
          <p className="flag">No validated norms past 70; that row is extended from the 60s.</p></section>

        <section><h2>Squat hold <em>seconds</em></h2><p className="how">{TESTS.squat.hint}</p>
          <table><thead><tr><th>Age</th><th>Typical</th><th>Strong</th></tr></thead>
            <tbody>{ageRows("squat").map(([a, b]) => { const g = at(a, b); return <tr key={a}><td>{lab(a, b)}</td><td>{valueAt("squat", g, "M", 50)}</td><td>{valueAt("squat", g, "M", 75)}{valueAt("squat", g, "M", 75) >= CLUB_SEC ? "" : "+"}</td></tr>; })}</tbody></table>
          <p className="flag">Groove estimate. No validated age norms exist for a squat or wall-sit hold. Hold {CLUB_SEC} seconds for the 1:00 Club.</p></section>

        <section><h2>Floor rise <em>score of 10</em></h2><p className="how">Sit to the floor and stand back up. Start at 10; minus 1 per hand, knee, forearm or side of leg; minus ½ per wobble.</p>
          <table className="bands"><thead><tr><th>Score</th><th>Tier</th><th>In the research</th></tr></thead>
            <tbody>{FLOOR_BANDS.map((b) => <tr key={b.tier}><td>{b.range}</td><td className={`t ${b.tier}`}>{b.tier[0].toUpperCase() + b.tier.slice(1)}</td><td>{b.risk}</td></tr>)}</tbody></table>
          <table className="mini"><thead><tr><th>Age</th>{ageRows("floor").map(([a, b]) => <th key={a}>{lab(a, b)}</th>)}</tr></thead>
            <tbody><tr><td>Typical, men</td>{ageRows("floor").map(([a, b]) => <td key={a}>{v("floor", at(a, b), "M", 50)}</td>)}</tr>
              <tr><td>Typical, women</td>{ageRows("floor").map(([a, b]) => <td key={a}>{v("floor", at(a, b), "F", 50)}</td>)}</tr></tbody></table></section>

        <section className="tiers"><h2>The tiers</h2>
          <ul><li><span className="t building">Building</span> Under the 25th percentile for your age</li>
            <li><span className="t solid">Solid</span> 25th to 74th</li><li><span className="t strong">Strong</span> 75th to 89th</li><li><span className="t elite">Elite</span> 90th and up</li></ul>
          <p><b>Combine Score.</b> Each test scores up to 100 against people your age and sex. All five, max 500.</p>
          <p className="small">Floor rise tiers follow mortality risk bands, not percentiles.</p></section>
      </div>

      <footer><p>A fun screening snapshot, not a diagnosis. Talk with a clinician before starting something new, especially with osteoporosis or a recent fall.</p>
        <p className="src"><b>Sources.</b> Grip: {SOURCES.grip.cite}. Balance: {SOURCES.balance.cite}. Push-ups: {SOURCES.pushups.cite}. Floor rise: {SOURCES.floor.cite}.</p></footer>
    </main>
  );
}

const CSS = `
@page { size: letter; margin: 0.35in; }
html, body { background: #FFFFFF !important; }
.sheet-pg { color: #0F4258; font-family: var(--font, Lato), system-ui, sans-serif; max-width: 7.8in; margin: 0 auto; padding: 0; font-size: 9pt; line-height: 1.3; }
.sheet-pg header > div { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 9pt; color: #3F6B7A; }
.sheet-pg header img { height: 18px; }
.sheet-pg header > div span { padding-left: 10px; border-left: 1px solid #C9D6DA; }
.sheet-pg h1 { font-family: "Combine Display", var(--font); font-weight: 900; text-transform: uppercase; font-size: 26pt; line-height: 1; margin: 4px 0 2px; letter-spacing: 0.01em; }
.sheet-pg header p { margin: 0 0 8px; font-size: 9.5pt; }
.sheet-pg .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.sheet-pg section { border: 1.5px solid #D8E3E6; border-radius: 12px; padding: 7px 10px; break-inside: avoid; }
.sheet-pg h2 { font-family: "Combine Display", var(--font); font-weight: 900; text-transform: uppercase; font-size: 15pt; margin: 0; letter-spacing: 0.02em; }
.sheet-pg h2 em { font-family: var(--font, Lato); font-style: normal; text-transform: none; font-weight: 700; font-size: 8.5pt; color: #3F6B7A; margin-left: 4px; letter-spacing: 0; }
.sheet-pg .how { margin: 2px 0 6px; color: #3F6B7A; font-size: 8.5pt; }
.sheet-pg table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.sheet-pg th, .sheet-pg td { padding: 1.8px 4px; text-align: center; border-bottom: 1px solid #EDF2F3; }
.sheet-pg th { font-size: 8pt; font-weight: 900; color: #0F4258; }
.sheet-pg tr.sub th { font-weight: 700; color: #6B8792; font-size: 7.5pt; }
.sheet-pg td:first-child, .sheet-pg th:first-child { text-align: left; font-weight: 700; }
.sheet-pg table:not(.mini):not(.bands) td:nth-child(2), .sheet-pg table:not(.mini):not(.bands) td:nth-child(4) { font-weight: 900; }
.sheet-pg .flag { margin: 6px 0 0; font-size: 8pt; color: #3F6B7A; }
.sheet-pg .bands td { text-align: left; font-weight: 400 !important; }
.sheet-pg .bands td:first-child { font-weight: 900 !important; white-space: nowrap; }
.sheet-pg .mini { margin-top: 6px; font-size: 8pt; }
.sheet-pg .mini td, .sheet-pg .mini th { padding: 2px 2px; }
.sheet-pg .t { display: inline-block; font-weight: 900; font-size: 8pt; padding: 1px 8px; border-radius: 99px; }
.sheet-pg .t.building { background: #F1E6D6; } .sheet-pg .t.solid { background: #DDF3F5; } .sheet-pg .t.strong { background: #0F4258; color: #FFFFFF; } .sheet-pg .t.elite { background: #FFCA42; }
.sheet-pg .tiers ul { list-style: none; padding: 0; margin: 6px 0; display: grid; gap: 5px; }
.sheet-pg .tiers li .t { width: 62px; text-align: center; margin-right: 6px; }
.sheet-pg .tiers p { margin: 6px 0 0; }
.sheet-pg .small { font-size: 8pt; color: #3F6B7A; }
.sheet-pg footer { margin-top: 7px; font-size: 7.5pt; color: #3F6B7A; }
.sheet-pg footer p { margin: 0 0 4px; }
`;
