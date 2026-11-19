const { JSDOM } = require('jsdom'); const fs = require('fs'); const { Client } = require('pg');
const FILE = process.argv[2];
(async () => {
  const pg = new Client({ host: '/tmp/pgd', port: 5544, user: 'postgres', database: 'neontest' }); await pg.connect();
  let calls = 0;
  const mcp = { callTool: async (server, tool, args) => { calls++;
    if (tool === 'run_sql') { const r = await pg.query(args.sql); return { payload: JSON.stringify(r.rows) }; }
    await pg.query('BEGIN'); try { for (const s of args.sql_statements) await pg.query(s); await pg.query('COMMIT'); return { payload: '[]' }; } catch (e) { await pg.query('ROLLBACK'); throw Object.assign(new Error(e.message), { code: 'tool_error' }); } } };
  const dom = new JSDOM(fs.readFileSync(FILE, 'utf8'), { runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true, beforeParse(w) { w.scrollTo = () => {}; w.claude = { use: async (n) => (n === 'mcp' ? mcp : null) }; } });
  const w = dom.window, doc = w.document; const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const ev = (s) => { try { return w.eval(s); } catch (e) { errs.push(s.slice(0, 50) + ' => ' + e.message); } };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(1000);
  ev("S.role='platform';S.acct='PLATFORM';S.user='U1';S.sel.node='N019';go('tree')"); await wait(100);
  const cell = () => doc.querySelector('.page [data-c="cell"][data-k="Name"]');
  console.log('view mode: cell disabled', cell()?.disabled, '| Edit button', !!doc.querySelector('[data-a="editon"]'), '| bar', !!doc.querySelector('.editbar'));
  doc.querySelector('[data-a="editon"]').click(); await wait(50);
  console.log('edit mode: cell enabled', cell()?.disabled === false, '| bar', doc.querySelector('.editbar .ebtxt')?.textContent.trim());
  const c = cell(); const id = c.dataset.id; c.value = 'Edited by test'; c.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(50);
  const before = calls;
  console.log('after change: dirty', ev('[...DIRTY].join()'), '| bar:', doc.querySelector('.editbar .ebtxt span')?.textContent, '| no save call yet:', calls === before);
  // try leaving without saving
  ev("go('features')"); await wait(50); console.log('leave guard shown:', !!doc.querySelector('[data-a="leavesave"]'), '| still on', ev('S.page'));
  doc.querySelector('[data-a="leavestay"].btn').click(); await wait(50);
  doc.querySelector('[data-a="editsave"]').click(); await wait(700);
  console.log('saved:', (await pg.query(`select name from core.nodes where id='${id}'`)).rows[0].name, '| editing', ev('S.editing'), '| bar gone', !doc.querySelector('.editbar'));
  // failure shows Neon's message
  ev("go('hardware')"); ev("DB.Device_Models=DB.Device_Models.filter(r=>r.ID!=='D01');touch('Device_Models');render()"); await wait(800);
  console.log('failure bar:', doc.querySelector('.editbar.err .ebtxt')?.textContent.slice(0, 140));
  doc.querySelector('[data-a="editcancel"]').click(); await wait(700);
  console.log('after cancel: D01 back', ev("!!byId('Device_Models','D01')"), '| editing', ev('S.editing'));
  // rail hover
  const aside = doc.querySelector('aside.side'); aside.dispatchEvent(new w.MouseEvent('mouseover', { bubbles: true })); console.log('hover opens:', aside.classList.contains('hov'));
  doc.querySelector('.nav[data-a="go"]').click(); await wait(50); console.log('collapses after choosing:', !doc.querySelector('aside.side').classList.contains('hov'));
  console.log('ERRORS', errs.length ? errs : 'none'); await pg.end(); process.exit(0);
})();
