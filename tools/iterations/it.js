#!/usr/bin/env node
// Iteration tracker: records every change (type, module, requirement, phase times, bugs,
// before/after screenshots) in iterations/IT-NNNN/record.json and builds iterations/report.html.
// Claude runs this itself for every change (see CLAUDE.md section 10). Usage: pnpm iter help
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { buildReport } from './report.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DIR = path.join(ROOT, 'iterations');
const APPS = {
  admin: 'http://localhost:5173',
  partner: 'http://localhost:5174',
  customer: 'http://localhost:5175',
};
const TYPES = { ui: 'UI/CSS', functional: 'Functional', major: 'Major' };
const PHASES = ['understanding', 'implementing', 'fixing', 'testing', 'waiting'];
const STATUSES = ['Completed', 'Pending', 'Failed'];

const HELP = `Iteration tracker

  pnpm iter start --type ui|functional|major --module "<module>" --req "<requirement>"
               [--tool claude|manual] [--dev "<name>"] [--estimate <hours>]
        Opens a new iteration (prints its ID). The clock starts in phase "understanding".
  pnpm iter phase <ID> understanding|implementing|fixing|testing|waiting
        Switches phase. "waiting" = waiting on the person (feedback, approval); it is
        reported separately and not counted as development time.
  pnpm iter shot <ID> before|after <admin|partner|customer> <path> [--as <demo user id>]
               [--label "<text>"] [--full] [--steps "click:<button>; fill:<placeholder>=<text>"]
        Screenshots a screen of the running dev server into the iteration folder.
        --steps clicks buttons / types into fields first, for workflow screenshots.
  pnpm iter bug <ID> "<what went wrong>" [--later]
        Logs a bug found during the iteration, or (--later) found after it was completed.
  pnpm iter round <ID> ["<what the person asked to change>"]
        Counts another round: the person asked for a correction or rework.
  pnpm iter note <ID> "<remark>"       Adds a remark.
  pnpm iter manual <ID> "<reason>"     Marks that a developer had to step in by hand.
  pnpm iter estimate <ID> <hours>      Development team's estimate for doing this by hand.
  pnpm iter finish <ID> [--status Completed|Pending|Failed] [--commit <hash>]
        Stops the clock (default status Completed; commit defaults to HEAD).
  pnpm iter list                       Shows all iterations.
  pnpm iter report                     Builds iterations/report.html.
`;

// ---------- helpers ----------
function args(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) opt[k] = true;
      else {
        opt[k] = v;
        i++;
      }
    } else pos.push(a);
  }
  return { pos, opt };
}
const now = () => new Date().toISOString();
const fail = (msg) => {
  console.error('Error: ' + msg);
  process.exit(1);
};
const git = (cmd) => {
  try {
    return execSync('git ' + cmd, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
};
const recPath = (id) => path.join(DIR, id, 'record.json');
function load(id) {
  if (!id) fail('give the iteration ID, for example IT-0001');
  id = normaliseId(id);
  if (!fs.existsSync(recPath(id))) fail(`no iteration ${id}`);
  return JSON.parse(fs.readFileSync(recPath(id), 'utf8'));
}
function save(r) {
  fs.mkdirSync(path.join(DIR, r.id), { recursive: true });
  fs.writeFileSync(recPath(r.id), JSON.stringify(r, null, 2) + '\n');
}
function normaliseId(id) {
  const n = String(id).match(/\d+/);
  return n ? 'IT-' + n[0].padStart(4, '0') : id;
}
function allIds() {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((d) => /^IT-\d{4}$/.test(d) && fs.existsSync(recPath(d)))
    .sort();
}
function closeSegment(r, at = now()) {
  const open = r.segments.at(-1);
  if (open && !open.to) open.to = at;
}
function needOpen(r) {
  if (r.finished_at) fail(`${r.id} is already finished`);
}

// ---------- commands ----------
const cmd = {
  start({ opt }) {
    const type = TYPES[String(opt.type || '').toLowerCase()];
    if (!type) fail('--type must be ui, functional or major');
    if (!opt.module || opt.module === true) fail('--module is required');
    if (!opt.req || opt.req === true) fail('--req (the requirement) is required');
    const ids = allIds();
    const next = ids.length ? Number(ids.at(-1).slice(3)) + 1 : 1;
    const id = 'IT-' + String(next).padStart(4, '0');
    const t = now();
    const r = {
      id,
      type,
      module: opt.module,
      requirement: opt.req,
      tool: String(opt.tool || 'claude').toLowerCase() === 'manual' ? 'Manual' : 'Claude Code',
      developer: opt.dev && opt.dev !== true ? opt.dev : git('config user.name') || 'unknown',
      branch: git('rev-parse --abbrev-ref HEAD'),
      status: 'Pending',
      started_at: t,
      finished_at: null,
      segments: [{ phase: 'understanding', from: t, to: null }],
      rounds: [],
      bugs: [],
      manual_intervention: [],
      remarks: [],
      screenshots: [],
      manual_estimate_hours: opt.estimate ? Number(opt.estimate) : null,
      commits: [],
      start_commit: git('rev-parse --short HEAD'),
    };
    save(r);
    console.log(id);
  },

  phase({ pos }) {
    const r = load(pos[0]);
    needOpen(r);
    const p = pos[1];
    if (!PHASES.includes(p)) fail('phase must be one of ' + PHASES.join(', '));
    const t = now();
    closeSegment(r, t);
    r.segments.push({ phase: p, from: t, to: null });
    save(r);
    console.log(`${r.id}: now ${p}`);
  },

  async shot({ pos, opt }) {
    const r = load(pos[0]);
    const when = pos[1];
    const app = pos[2];
    // Git Bash rewrites "/x" into "C:/Program Files/Git/x"; undo that, and allow "x" for "/x".
    let route = (pos[3] || '/').replace(/^[A-Za-z]:\/.*?\/Git(?=\/|$)/i, '') || '/';
    if (!route.startsWith('/')) route = '/' + route;
    if (!['before', 'after'].includes(when)) fail('say before or after');
    if (!APPS[app]) fail('app must be admin, partner or customer');
    const n = r.screenshots.filter((s) => s.when === when).length + 1;
    const file = `${when}-${n}.png`;
    const out = path.join(DIR, r.id, file);
    const { chromium } = await import('@playwright/test');
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const base = APPS[app];
      if (opt.as && opt.as !== true) {
        // Sign in through the page's own demo-account list, then open the screen.
        const signInUrl = route.startsWith('/app/')
          ? base + route.split('/').slice(0, 3).join('/')
          : base + '/';
        await page.goto(signInUrl);
        await page.locator(`button[data-user="${opt.as}"]`).click({ timeout: 20_000 });
        await page.getByRole('button', { name: 'Sign in', exact: true }).click();
        await page.waitForLoadState('networkidle');
      }
      await page.goto(base + route);
      await page.waitForLoadState('networkidle');
      await page
        .locator('.ui-loading')
        .first()
        .waitFor({ state: 'detached', timeout: 15_000 })
        .catch(() => {});
      // Workflow steps before the picture: "click:Button text; fill:Placeholder or label=text".
      for (const step of String(opt.steps && opt.steps !== true ? opt.steps : '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)) {
        const [kind, ...restOf] = step.split(':');
        const arg = restOf.join(':').trim();
        if (kind === 'click') {
          await page
            .getByRole('button', { name: arg })
            .or(page.getByRole('tab', { name: arg }))
            .first()
            .click();
        } else if (kind === 'fill') {
          const [label, ...text] = arg.split('=');
          await page
            .getByPlaceholder(label.trim())
            .or(page.getByLabel(label.trim()))
            .first()
            .fill(text.join('='));
        } else fail(`unknown step "${step}" (use click: or fill:)`);
        await page.waitForTimeout(300);
      }
      await page.waitForTimeout(400);
      await page.screenshot({ path: out, fullPage: Boolean(opt.full) });
    } finally {
      await browser.close();
    }
    r.screenshots.push({
      when,
      file,
      app,
      path: route,
      as: opt.as && opt.as !== true ? opt.as : null,
      steps: opt.steps && opt.steps !== true ? opt.steps : null,
      label: opt.label && opt.label !== true ? opt.label : `${app} ${route}`,
      at: now(),
    });
    save(r);
    console.log(`${r.id}: saved iterations/${r.id}/${file}`);
  },

  bug({ pos, opt }) {
    const r = load(pos[0]);
    if (!pos[1]) fail('describe the bug');
    r.bugs.push({ text: pos[1], found: opt.later ? 'after completion' : 'during', at: now() });
    save(r);
    console.log(`${r.id}: bug logged (${r.bugs.length})`);
  },

  round({ pos }) {
    const r = load(pos[0]);
    r.rounds.push({ text: pos[1] || '', at: now() });
    save(r);
    console.log(`${r.id}: round ${r.rounds.length + 1}`);
  },

  note({ pos }) {
    const r = load(pos[0]);
    if (!pos[1]) fail('write the remark');
    r.remarks.push(pos[1]);
    save(r);
    console.log(`${r.id}: remark added`);
  },

  manual({ pos }) {
    const r = load(pos[0]);
    if (!pos[1]) fail('say why a developer had to step in');
    r.manual_intervention.push(pos[1]);
    save(r);
    console.log(`${r.id}: manual intervention logged`);
  },

  estimate({ pos }) {
    const r = load(pos[0]);
    const h = Number(pos[1]);
    if (!(h > 0)) fail('give the estimate in hours, for example 3 or 0.5');
    r.manual_estimate_hours = h;
    save(r);
    console.log(`${r.id}: manual estimate ${h} h`);
  },

  finish({ pos, opt }) {
    const r = load(pos[0]);
    needOpen(r);
    const status = opt.status && opt.status !== true ? opt.status : 'Completed';
    if (!STATUSES.includes(status)) fail('status must be ' + STATUSES.join(', '));
    const t = now();
    closeSegment(r, t);
    r.finished_at = t;
    r.status = status;
    const commit = opt.commit && opt.commit !== true ? opt.commit : git('rev-parse --short HEAD');
    if (commit && commit !== r.start_commit && !r.commits.includes(commit)) r.commits.push(commit);
    save(r);
    console.log(`${r.id}: ${status}`);
  },

  list() {
    for (const id of allIds()) {
      const r = load(id);
      console.log(
        [r.id, r.type.padEnd(10), r.status.padEnd(9), r.module, '-', r.requirement].join(' '),
      );
    }
  },

  report() {
    const out = buildReport(DIR, allIds().map(load));
    console.log('Report: ' + path.relative(ROOT, out));
  },

  help() {
    console.log(HELP);
  },
};

const [name, ...rest] = process.argv.slice(2);
const run = cmd[name || 'help'];
if (!run) fail(`unknown command "${name}". Try: pnpm iter help`);
await run(args(rest));
