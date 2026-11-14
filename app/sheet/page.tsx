import { ageRows, valueAt, gripKgAt, fmt, SOURCES, CLUB_SEC, FLOOR_BANDS, type Sex, type TestId } from "@/lib/norms";

export const metadata = { title: "Combine Benchmarks" };

const lab = (a: number, b: number) => (a === 0 ? `18–${b}` : b >= 100 ? `${a}+` : `${a}–${b}`);
const at = (a: number, b: number) => (a === 0 ? b : a);
const lb = (age: number, sex: Sex) => Math.round(gripKgAt(age, sex, 50) * 2.2046);
const typ = (t: TestId, age: number, sex: Sex, eo?: boolean) => fmt(t, valueAt(t, age, sex, 50, eo));

function Table({ cols, rows }: { cols: string[]; rows: (string | number)[][] }) {
  return (
    <table><thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>{rows.map((r) => <tr key={String(r[0])}>{r.map((x, i) => <td key={i}>{x}</td>)}</tr>)}</tbody></table>
  );
}

function Card({ title, unit, how, children, note }: { title: string; unit?: string; how: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="card"><div className="ch"><h2>{title}</h2>{unit && <span className="u">{unit}</span>}</div>
      <p className="how">{how}</p>{children}{note && <p className="fn">{note}</p>}</section>
  );
}

export default function Sheet() {
  return (
    <main className="bm">
      <style>{CSS}</style>
      <header>
        <div className="brand"><img src="/logo-cream.png" alt="groove" /><span>Longevity Combine · HLTH 2026</span></div>
        <h1>How do you compare?</h1>
        <p>Find your age row. Each number is <b>typical</b> for your age: half of people score above it, half below.</p>
      </header>

      <div className="grid">
        <Card title="Grip strength" unit="pounds" how="Dominant hand, best of 3. Able Assess also shows your percentile."
          note="Under 60 lb (men) or 35 lb (women) is low at any age.">
          <Table cols={["Age", "Men", "Women"]} rows={ageRows("grip").map(([a, b]) => [lab(a, b), lb(at(a, b), "M"), lb(at(a, b), "F")])} />
        </Card>

        <Card title="One-leg balance" unit="seconds" how="Arms crossed, best of 3, stop at 45. Men and women score the same.">
          <Table cols={["Age", "Closed", "Open"]} rows={ageRows("balance").map(([a, b]) => [lab(a, b), typ("balance", at(a, b), "F"), typ("balance", at(a, b), "F", true)])} />
        </Card>

        <Card title="Push-ups" unit="reps" how="As many as you can with good form. Men full, women from the knees."
          note="No validated norms past 70.">
          <Table cols={["Age", "Men", "Women"]} rows={ageRows("pushups").map(([a, b]) => [lab(a, b), typ("pushups", at(a, b), "M"), typ("pushups", at(a, b), "F")])} />
        </Card>

        <Card title="Squat hold" unit="seconds" how={`Thighs parallel, no wall. Stop at ${CLUB_SEC} for the 1:00 Club.`}
          note="Groove estimate. No validated age norms exist for this hold.">
          <Table cols={["Age", "Typical"]} rows={ageRows("squat").map(([a, b]) => [lab(a, b), valueAt("squat", at(a, b), "M", 50)])} />
        </Card>

        <Card title="Floor rise" unit="score of 10" how="Down to the floor and back up. Minus 1 per hand, knee or forearm. One hand each way is an 8."
          note="Typical: about 10 under 40, 8 in the 50s, 6 in the 60s.">
          <div className="bands">{FLOOR_BANDS.map((b) => <div key={b.tier} className="band"><div className="bt"><span className="sc">{b.range}</span><span className={`pill ${b.tier}`}>{b.tier[0].toUpperCase() + b.tier.slice(1)}</span></div><span className="rk">{b.risk}</span></div>)}</div>
        </Card>

        <section className="card tiers"><div className="ch"><h2>Your tier</h2></div>
          <p className="how">Each result is ranked against people your age and sex.</p>
          <div className="bands">
            {([["building", "Below the 25th percentile"], ["solid", "25th to 74th"], ["strong", "75th to 89th"], ["elite", "90th and up"]] as const).map(([t, d]) => (
              <div key={t} className="band row"><span className={`pill ${t}`}>{t[0].toUpperCase() + t.slice(1)}</span><span className="rk">{d}</span></div>))}
          </div>
          <p className="combine"><b>Combine Score</b> Each test scores up to 100. Do all five for a max of 500.</p>
        </section>
      </div>

      <footer>
        <p>A screening snapshot, not a diagnosis. Talk with a clinician before starting something new, especially with osteoporosis or a recent fall.</p>
        <p><b>Sources</b> Grip: Wang et al., JOSPT 2018; EWGSOP2. Balance: {SOURCES.balance.cite}. Push-ups: ACSM; CSEP. Floor rise: Brito et al. 2012; Araújo et al. 2020, 2025.</p>
      </footer>
    </main>
  );
}

const CSS = `
@page { size: letter; margin: 0; }
html, body { background: #FFFFFF !important; margin: 0; }
.bm { width: 8.5in; height: 11in; box-sizing: border-box; display: flex; flex-direction: column; color: rgba(0,0,0,0.87); font-family: var(--font, Lato), system-ui, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; overflow: hidden; }
.bm header { background: #0F4258; color: #F4F2EC; padding: 28px 48px 24px; }
.bm .brand { display: flex; align-items: center; gap: 12px; font-size: 13px; font-weight: 700; color: #B2EBF0; letter-spacing: 0.02em; }
.bm .brand img { height: 22px; }
.bm .brand span { padding-left: 12px; border-left: 1px solid rgba(178,235,240,0.4); }
.bm h1 { font-family: "Combine Display", var(--font); font-weight: 900; text-transform: uppercase; font-size: 44px; line-height: 1; color: #FFCA42; margin: 14px 0 6px; letter-spacing: 0.01em; }
.bm header p { margin: 0; font-size: 15px; line-height: 1.5; color: #F4F2EC; }
.bm .grid { flex: 1; min-height: 0; display: grid; padding-bottom: 0; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 16px; padding: 24px 48px 0; }
.bm .card { border: 1px solid #CBD3D6; border-radius: 12px; padding: 16px 18px; min-height: 0; display: flex; flex-direction: column; }
.bm .ch { display: flex; align-items: baseline; flex-wrap: wrap; column-gap: 8px; }
.bm h2 { font-family: "Combine Display", var(--font); font-weight: 900; text-transform: uppercase; font-size: 21px; letter-spacing: 0.02em; margin: 0; color: #0F4258; }
.bm .u { font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: rgba(0,0,0,0.6); }
.bm .how { margin: 4px 0 12px; font-size: 12px; line-height: 1.45; color: rgba(0,0,0,0.6); }
.bm table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.bm th { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: rgba(0,0,0,0.6); text-align: right; padding: 0 0 6px; border-bottom: 1px solid #CBD3D6; white-space: nowrap; }
.bm td { font-size: 14px; padding: 4px 0; white-space: nowrap; text-align: right; border-bottom: 1px solid #EEF2F3; font-weight: 700; color: #0F4258; }
.bm th:first-child, .bm td:first-child { text-align: left; }
.bm td:first-child { font-weight: 400; color: rgba(0,0,0,0.87); }
.bm tr:last-child td { border-bottom: 0; }
.bm .fn { margin: auto 0 0; padding-top: 10px; font-size: 11.5px; line-height: 1.45; color: rgba(0,0,0,0.6); }
.bm .bands { display: grid; gap: 9px; margin-top: 0; }
.bm .band { display: grid; gap: 2px; font-size: 12.5px; line-height: 1.4; }
.bm .band .bt { display: flex; align-items: center; justify-content: space-between; }
.bm .band.row { grid-template-columns: 76px 1fr; align-items: center; gap: 10px; }
.bm .band .pill { width: 76px; }
.bm .sc { font-weight: 700; color: #0F4258; font-size: 15px; }
.bm .rk { color: rgba(0,0,0,0.75); }
.bm .pill { display: inline-block; text-align: center; font-size: 12px; font-weight: 700; padding: 4px 0; border-radius: 1000px; }
.bm .pill.building { background: #F1E6D6; color: #6B4A16; } .bm .pill.solid { background: #DDF3F5; color: #0F4258; }
.bm .pill.strong { background: #0F4258; color: #FFFFFF; } .bm .pill.elite { background: #FFCA42; color: #0F4258; }
.bm .combine { margin: auto 0 0; padding-top: 10px; border-top: 1px solid #EEF2F3; font-size: 13px; line-height: 1.45; }
.bm .combine b { display: block; color: #0F4258; }
.bm footer { padding: 14px 48px 24px; font-size: 10px; line-height: 1.5; color: rgba(0,0,0,0.6); }
.bm footer p { margin: 0 0 4px; }
@media screen { body { background: #F4F6F7 !important; } .bm { margin: 24px auto; background: #FFFFFF; box-shadow: 0 2px 16px rgba(0,0,0,0.08); } }
`;
