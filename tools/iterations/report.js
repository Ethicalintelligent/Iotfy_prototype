// Builds iterations/report.html from the iteration records: summary, Claude Code vs manual
// comparison, quality, and every iteration with its before/after screenshots (embedded, so the
// report is one file you can send).
import fs from 'node:fs';
import path from 'node:path';

const TYPES = ['UI/CSS', 'Functional', 'Major'];
const DEV_PHASES = ['understanding', 'implementing', 'fixing'];

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

/** Minutes, shown as "12 min" or "2 h 05 min". */
function fmt(min) {
  if (min == null || Number.isNaN(min)) return '–';
  if (min < 1) return `${Math.round(min * 60)} s`;
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}

/** Per-iteration figures, all in minutes. */
export function measure(r, at = new Date()) {
  const per = { understanding: 0, implementing: 0, fixing: 0, testing: 0, waiting: 0 };
  for (const s of r.segments) {
    const to = s.to ? new Date(s.to) : at;
    per[s.phase] = (per[s.phase] || 0) + (to - new Date(s.from)) / 60000;
  }
  const dev = sum(DEV_PHASES.map((p) => per[p]));
  const total = dev + per.testing;
  return {
    ...per,
    dev,
    test: per.testing,
    total,
    rounds: 1 + r.rounds.length,
    bugsDuring: r.bugs.filter((b) => b.found === 'during').length,
    bugsLater: r.bugs.filter((b) => b.found !== 'during').length,
    estimate: r.manual_estimate_hours != null ? r.manual_estimate_hours * 60 : null,
  };
}

function loadConfig(dir) {
  const f = path.join(dir, 'config.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
}

function img(dir, r, s) {
  const f = path.join(dir, r.id, s.file);
  if (!fs.existsSync(f)) return `<div class="missing">Missing: ${esc(s.file)}</div>`;
  const b64 = fs.readFileSync(f).toString('base64');
  return `<figure><img src="data:image/png;base64,${b64}" alt="${esc(s.label)}"><figcaption>${esc(s.label)}${s.as ? ` · signed in as ${esc(s.as)}` : ''}</figcaption></figure>`;
}

export function buildReport(dir, records) {
  fs.mkdirSync(dir, { recursive: true });
  const cfg = loadConfig(dir);
  const cur = cfg.currency || '';
  const rate = cfg.developerHourlyRate ?? null;
  const rows = records.map((r) => ({ r, m: measure(r) }));
  const done = rows.filter((x) => x.r.status === 'Completed');
  const claude = done.filter((x) => x.r.tool === 'Claude Code');
  const manual = done.filter((x) => x.r.tool === 'Manual');
  const ofType = (xs, t) => xs.filter((x) => x.r.type === t);

  // ----- time saved: completed Claude iterations that have a development-team estimate -----
  const compared = claude.filter((x) => x.m.estimate != null);
  const savedMin = sum(compared.map((x) => x.m.estimate - x.m.total));
  const savedCost = rate != null ? (savedMin / 60) * rate : null;

  const kpi = (label, value, note = '') =>
    `<div class="kpi"><div class="kpi__v">${value}</div><div class="kpi__l">${label}</div>${note ? `<div class="kpi__n">${note}</div>` : ''}</div>`;

  const typeRow = (t) => {
    const c = ofType(claude, t);
    const m = ofType(manual, t);
    const est = ofType(compared, t);
    const cAvg = avg(c.map((x) => x.m.total));
    const mAvg = avg(m.map((x) => x.m.total));
    const eAvg = avg(est.map((x) => x.m.estimate));
    const base = mAvg ?? eAvg;
    const faster = cAvg && base ? `${(base / cAvg).toFixed(1)}×` : '–';
    return `<tr><th>${t}</th><td>${rows.filter((x) => x.r.type === t).length}</td>
      <td>${fmt(cAvg)}</td><td>${fmt(avg(c.map((x) => x.m.test)))}</td>
      <td>${fmt(mAvg)} <span class="sub">(${m.length})</span></td>
      <td>${fmt(eAvg)} <span class="sub">(${est.length})</span></td>
      <td><b>${faster}</b></td>
      <td>${c.length ? avg(c.map((x) => x.m.bugsDuring + x.m.bugsLater)).toFixed(1) : '–'}</td>
      <td>${m.length ? avg(m.map((x) => x.m.bugsDuring + x.m.bugsLater)).toFixed(1) : '–'}</td>
      <td>${c.length ? avg(c.map((x) => x.m.rounds)).toFixed(1) : '–'}</td></tr>`;
  };

  const phaseRow = (t) => {
    const c = ofType(claude, t);
    const a = (p) => fmt(avg(c.map((x) => x.m[p])));
    return `<tr><th>${t}</th><td>${a('understanding')}</td><td>${a('implementing')}</td><td>${a('fixing')}</td><td>${a('testing')}</td><td>${a('total')}</td><td>${a('waiting')}</td></tr>`;
  };

  const interventions = rows.filter((x) => x.r.manual_intervention.length);
  const firstTry = claude.filter((x) => x.m.rounds === 1).length;

  const table = rows
    .map(
      ({ r, m }) => `<tr>
      <td><a href="#${r.id}">${r.id}</a></td><td>${esc(r.type)}</td><td>${esc(r.module)}</td>
      <td class="req">${esc(r.requirement)}</td>
      <td>${r.screenshots.filter((s) => s.when === 'before').length}</td>
      <td>${r.screenshots.filter((s) => s.when === 'after').length}</td>
      <td>${fmt(m.dev)}</td><td>${fmt(m.test)}</td><td><b>${fmt(m.total)}</b></td>
      <td><span class="st st--${r.status.toLowerCase()}">${esc(r.status)}</span></td>
      <td>${esc(r.tool)}</td><td>${esc(r.developer)}</td>
      <td class="req">${esc([...r.remarks, ...r.manual_intervention.map((t) => 'Manual: ' + t)].join(' · '))}</td></tr>`,
    )
    .join('');

  const details = rows
    .map(({ r, m }) => {
      const shots = (when) => r.screenshots.filter((s) => s.when === when);
      const before = shots('before');
      const after = shots('after');
      return `<section class="it" id="${r.id}">
      <header><h3>${r.id} · ${esc(r.module)}</h3><span class="chip">${esc(r.type)}</span>
        <span class="st st--${r.status.toLowerCase()}">${esc(r.status)}</span></header>
      <p class="req-big">${esc(r.requirement)}</p>
      <dl>
        <div><dt>Tool</dt><dd>${esc(r.tool)}</dd></div>
        <div><dt>Developer</dt><dd>${esc(r.developer)}</dd></div>
        <div><dt>Started</dt><dd>${new Date(r.started_at).toLocaleString()}</dd></div>
        <div><dt>Understanding</dt><dd>${fmt(m.understanding)}</dd></div>
        <div><dt>Implementation</dt><dd>${fmt(m.implementing)}</dd></div>
        <div><dt>Bug fixing</dt><dd>${fmt(m.fixing)}</dd></div>
        <div><dt>Testing</dt><dd>${fmt(m.test)}</dd></div>
        <div><dt>Total</dt><dd><b>${fmt(m.total)}</b></dd></div>
        <div><dt>Waiting on person</dt><dd>${fmt(m.waiting)}</dd></div>
        <div><dt>Rounds</dt><dd>${m.rounds}</dd></div>
        <div><dt>Bugs</dt><dd>${m.bugsDuring} during · ${m.bugsLater} later</dd></div>
        <div><dt>Manual estimate</dt><dd>${m.estimate != null ? fmt(m.estimate) : '–'}</dd></div>
        <div><dt>Commits</dt><dd>${esc(r.commits.join(', ') || '–')}</dd></div>
      </dl>
      ${r.rounds.length ? `<p><b>Corrections asked for:</b> ${r.rounds.map((x) => esc(x.text || 'rework')).join(' · ')}</p>` : ''}
      ${r.bugs.length ? `<p><b>Bugs:</b> ${r.bugs.map((b) => `${esc(b.text)} <span class="sub">(${b.found})</span>`).join(' · ')}</p>` : ''}
      ${r.manual_intervention.length ? `<p><b>Developer had to step in:</b> ${r.manual_intervention.map(esc).join(' · ')}</p>` : ''}
      ${r.remarks.length ? `<p><b>Remarks:</b> ${r.remarks.map(esc).join(' · ')}</p>` : ''}
      <div class="shots">
        <div><h4>Before</h4>${before.length ? before.map((s) => img(dir, r, s)).join('') : '<div class="missing">No before screenshot</div>'}</div>
        <div><h4>After</h4>${after.length ? after.map((s) => img(dir, r, s)).join('') : '<div class="missing">No after screenshot</div>'}</div>
      </div></section>`;
    })
    .join('');

  const missingShots = rows.filter(
    (x) =>
      x.r.status === 'Completed' &&
      (!x.r.screenshots.some((s) => s.when === 'before') ||
        !x.r.screenshots.some((s) => s.when === 'after')),
  ).length;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Iteration Report</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--ink:#16202b;--mute:#5b6773;--line:#e2e6ea;--accent:#1f6feb;
--ok:#1a7f37;--ok-bg:#e6f4ea;--warn:#9a6700;--warn-bg:#fff4d6;--bad:#cf222e;--bad-bg:#fde8e8}
@media (prefers-color-scheme:dark){:root{--bg:#0f141a;--card:#171d24;--ink:#e6edf3;--mute:#8d99a6;
--line:#2a333d;--accent:#58a6ff;--ok:#56d364;--ok-bg:#12301b;--warn:#e3b341;--warn-bg:#33270b;--bad:#ff7b72;--bad-bg:#3a1416}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,Segoe UI,sans-serif}
main{max-width:1200px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 12px}h3{font-size:16px;margin:0}h4{margin:0 0 8px;font-size:13px;color:var(--mute);text-transform:uppercase;letter-spacing:.04em}
.sub{color:var(--mute);font-size:12px}a{color:var(--accent)}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}@media (max-width:720px){.kpis{grid-template-columns:1fr 1fr}}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}
.kpi__v{font-size:22px;font-weight:650}.kpi__l{color:var(--mute);font-size:12px}.kpi__n{color:var(--mute);font-size:11px;margin-top:4px}
.wrap{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:10px}
table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;white-space:nowrap}
thead th{color:var(--mute);font-weight:600;font-size:12px}td.req{white-space:normal;min-width:220px}
.st{font-size:12px;padding:2px 8px;border-radius:99px;white-space:nowrap}.st--completed{background:var(--ok-bg);color:var(--ok)}
.st--pending{background:var(--warn-bg);color:var(--warn)}.st--failed{background:var(--bad-bg);color:var(--bad)}
.chip{font-size:12px;padding:2px 8px;border-radius:99px;border:1px solid var(--line)}
.it{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;margin:16px 0}
.it header{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.req-big{font-size:15px;margin:8px 0 12px}
dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:0 0 12px}dl div{border-left:2px solid var(--line);padding-left:8px}
dt{color:var(--mute);font-size:11px}dd{margin:0}
.shots{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}@media (max-width:720px){.shots{grid-template-columns:1fr}}
figure{margin:0 0 12px}img{width:100%;border:1px solid var(--line);border-radius:6px;display:block}figcaption{color:var(--mute);font-size:12px;margin-top:4px}
.missing{border:1px dashed var(--line);border-radius:6px;padding:24px;color:var(--mute);text-align:center}
.note{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:8px;padding:12px 14px;color:var(--mute)}
ol li{margin-bottom:6px}
</style></head><body><main>
<h1>Development Iteration Report</h1>
<div class="sub">IoTIFY prototype · generated ${new Date().toLocaleString()} · ${rows.length} iterations recorded</div>

<h2>Summary</h2>
<div class="kpis">
${kpi('Total iterations', rows.length, `${done.length} completed · ${rows.filter((x) => x.r.status === 'Pending').length} pending · ${rows.filter((x) => x.r.status === 'Failed').length} failed`)}
${kpi('Small UI / CSS changes', rows.filter((x) => x.r.type === 'UI/CSS').length)}
${kpi('Functional changes', rows.filter((x) => x.r.type === 'Functional').length)}
${kpi('Major changes', rows.filter((x) => x.r.type === 'Major').length)}
${kpi('Time saved', compared.length ? fmt(savedMin) : '–', compared.length ? `vs team estimates on ${compared.length} iterations` : 'needs development-team estimates')}
${kpi('Cost saved', savedCost != null && compared.length ? `${cur} ${Math.round(savedCost).toLocaleString()}` : '–', rate == null ? 'set developerHourlyRate in iterations/config.json' : `at ${cur} ${rate}/h`)}
${kpi('Right first time', claude.length ? `${Math.round((firstTry / claude.length) * 100)}%` : '–', 'Claude iterations with no correction round')}
${kpi('Needed a developer', interventions.length, 'iterations with manual intervention')}
</div>

<h2>Claude Code vs development team, by type</h2>
<div class="wrap"><table><thead><tr><th>Type</th><th>Count</th><th>Claude avg total</th><th>Claude avg testing</th>
<th>Manual avg (measured)</th><th>Manual estimate avg</th><th>Claude faster by</th><th>Bugs / iteration (Claude)</th><th>Bugs / iteration (manual)</th><th>Rounds (Claude)</th></tr></thead>
<tbody>${TYPES.map(typeRow).join('')}</tbody></table></div>
<p class="sub">"Faster by" uses measured manual times where there are any, otherwise the team's estimates. Only completed iterations count. Bracketed numbers are how many iterations each average is based on.</p>

<h2>Where Claude Code's time goes (averages, completed)</h2>
<div class="wrap"><table><thead><tr><th>Type</th><th>Understanding</th><th>Implementation</th><th>Bug fixing</th><th>Testing</th><th>Total</th><th>Waiting on person</th></tr></thead>
<tbody>${TYPES.map(phaseRow).join('')}</tbody></table></div>

<h2>Changes that still needed a developer</h2>
${interventions.length ? `<ul>${interventions.map((x) => `<li><a href="#${x.r.id}">${x.r.id}</a> (${esc(x.r.type)}, ${esc(x.r.module)}): ${x.r.manual_intervention.map(esc).join('; ')}</li>`).join('')}</ul>` : '<p class="sub">None recorded yet.</p>'}

<h2>How the numbers are measured</h2>
<div class="note">
Times are clock times recorded while the work happens, not estimates. <b>Development time</b> = understanding + implementation + bug fixing.
<b>Total</b> = development + testing. <b>Waiting on person</b> (feedback, approvals, questions) is kept separate and is not counted in the total.
A <b>round</b> is each time the person asked for a correction. <b>Bugs</b> are problems found during the iteration or reported after it was marked completed.
Manual figures come from two sources: iterations the team does by hand and records with <code>--tool manual</code> (measured), and the team's own estimate for each Claude iteration (estimate).
${missingShots ? `<br><b>${missingShots} completed iteration(s) are missing a before or after screenshot.</b>` : ''}
</div>

<h2>All iterations</h2>
<div class="wrap"><table><thead><tr><th>ID</th><th>Type</th><th>Module</th><th>Requirement</th><th>Before</th><th>After</th>
<th>Development</th><th>Testing</th><th>Total</th><th>Status</th><th>Tool</th><th>Developer</th><th>Remarks</th></tr></thead>
<tbody>${table || '<tr><td colspan="13" class="sub">No iterations yet.</td></tr>'}</tbody></table></div>

<h2>Iteration details and screenshots</h2>
${details}
</main></body></html>`;
  const out = path.join(dir, 'report.html');
  fs.writeFileSync(out, html);
  return out;
}
