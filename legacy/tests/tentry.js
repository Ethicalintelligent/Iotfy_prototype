const { JSDOM } = require('jsdom'); const fs = require('fs'); const { Client } = require('pg');
(async () => {
  const pg = new Client({ host: '/tmp/pgd', port: 5544, user: 'postgres', database: 'neontest' }); await pg.connect();
  const mcp = { callTool: async (s, tool, a) => { if (tool === 'run_sql') return { payload: JSON.stringify((await pg.query(a.sql)).rows) }; await pg.query('BEGIN'); try { for (const q of a.sql_statements) await pg.query(q); await pg.query('COMMIT'); return { payload: '[]' }; } catch (e) { await pg.query('ROLLBACK'); throw e; } } };
  const dom = new JSDOM(fs.readFileSync('/home/claude/app/index.html', 'utf8'), { runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true, beforeParse(w) { w.scrollTo = () => {}; w.claude = { use: async (n) => (n === 'mcp' ? mcp : null) }; } });
  const w = dom.window, d = w.document, errs = []; w.addEventListener('error', (e) => errs.push(e.message)); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(1200);
  const eps = [...d.querySelectorAll('a.ep')]; console.log('platform sign-in: entry points', eps.length, '| groups', [...d.querySelectorAll('.epg>span')].map((x) => x.textContent).join(', '));
  console.log('admin demo accounts:', d.querySelectorAll('.demoacct').length);
  const login = async (uid) => { d.getElementById('lemail').value = w.eval(`userEmail(byId('Users','${uid}'))`); d.getElementById('lpass').value = 'x'; d.querySelector('form.lform').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); await wait(150); };
  await login('U1'); console.log('admin signed in:', w.eval('S.role'), d.title);
  for (const [hash, tryU, okU] of [['#app-n052', 'U8', 'U4'], ['#app-n051', 'U4', 'U4'], ['#app-n004', 'U8', 'U4'], ['#app-n003', 'U4', 'U8'], ['#app-n009', 'U4', 'U7']]) {
    w.location.hash = hash; await wait(150);
    console.log(`\n${hash}: title "${d.title}" | signed in? ${!!w.eval('S.role')} | heading "${d.querySelector('.lform h2')?.textContent}" | demo: ${[...d.querySelectorAll('.demoacct b')].map((b) => b.textContent).join(', ')}`);
    if (w.eval('S.role')) { w.eval('A.signout()'); await wait(150); w.location.hash = hash; await wait(150); } await login(tryU); console.log('  ', tryU, '→', d.querySelector('.lform .note')?.textContent);
    await login(okU); await wait(200); console.log('  ', okU, '→ in as', w.eval('curUser().Name'), '| brand', d.querySelector('.brand b')?.textContent, '| cards', [...d.querySelectorAll('.page .card h3')].map((h) => h.textContent).join(', '));
  }
  w.location.hash = '#app-n004'; await wait(150); console.log('\nback to #app-n004: still signed in as', w.eval('curUser().Name'));
  w.location.hash = ''; await wait(150); console.log('back to admin: role', w.eval('S.role'), '| brand', d.querySelector('.brand b')?.textContent, '| title', d.title);
  w.location.hash = '#app-n999'; await wait(150); console.log('unknown entry point → admin:', w.eval('S.role'));
  console.log('ERRORS', errs.length ? errs : 'none'); await pg.end(); process.exit(0);
})();
