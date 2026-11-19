const { JSDOM } = require('jsdom'); const fs = require('fs'); const { Client } = require('pg');
(async () => {
  const pg = new Client({ host: '/tmp/pgd', port: 5544, user: 'postgres', database: 'neontest' }); await pg.connect();
  const mcp = { callTool: async (s, tool, a) => { if (tool === 'run_sql') return { payload: JSON.stringify((await pg.query(a.sql)).rows) }; return { payload: '[]' }; } };
  const dom = new JSDOM(fs.readFileSync('/home/claude/app/index.html', 'utf8'), { runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true, beforeParse(w) { w.scrollTo = () => {}; w.claude = { use: async (n) => (n === 'mcp' ? mcp : null) }; } });
  const w = dom.window, d = w.document, errs = []; w.addEventListener('error', (e) => errs.push(e.message)); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(1500);
  const ids = w.eval('entryProducts().map(n=>n.ID)'); let problems = 0;
  for (const id of ids) {
    d.location.hash = '#app-' + id.toLowerCase(); await wait(120);
    if (w.eval('S.role')) { w.eval('A.signout()'); await wait(50); }
    const u = w.eval('loginUsers()[0]?.ID'); if (!u) { console.log(id, 'NO DEMO USER'); problems++; continue; }
    w.eval(`signInAs(byId('Users','${u}'))`); await wait(150);
    const nav = w.eval("ROLE_DEF[S.role].nav.flatMap(([s,i])=>i.map(x=>x[0]))");
    const bad = [];
    for (const p of nav) { try { w.eval(`go('${p}')`); } catch (e) { bad.push(p + ':' + e.message); continue; } await wait(10); const txt = d.querySelector('.page')?.textContent || ''; if (!txt || txt.includes('Coming soon') || txt.includes('undefined') || txt.includes('NaN')) bad.push(p); }
    const dash = (w.eval("go(ROLE_DEF[S.role].nav[0][1][0][0]), document.querySelector('.xkpis')?.textContent.replace(/\\s+/g,' ').slice(0,90)") || '');
    console.log(`${id} ${w.eval('prodName()').padEnd(42)} ${w.eval('curUser().Name').padEnd(28)} ${nav.length} screens ${bad.length ? 'PROBLEMS ' + bad.join(',') : 'ok'} | ${dash}`);
    problems += bad.length;
  }
  console.log('problems', problems, 'ERRORS', errs.length ? errs.slice(0, 5) : 'none'); await pg.end(); process.exit(0);
})();
