const { JSDOM } = require('jsdom'); const fs = require('fs'); const { Client } = require('pg');
(async () => {
  const pg = new Client({ host: '/tmp/pgd', port: 5544, user: 'postgres', database: 'neontest' }); await pg.connect();
  await pg.query("update core.dealers set support_access_until=current_date+7 where id='DL1'; update core.companies set support_access_until=current_date+7 where id='C1'; delete from core.support_sessions");
  const mcp = { callTool: async (s, tool, a) => { if (tool === 'run_sql') return { payload: JSON.stringify((await pg.query(a.sql)).rows) }; await pg.query('BEGIN'); try { for (const q of a.sql_statements) await pg.query(q); await pg.query('COMMIT'); return { payload: '[]' }; } catch (e) { await pg.query('ROLLBACK'); throw e; } } };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const errs = [];
  const open = async (app, hash = '') => { const dom = new JSDOM(fs.readFileSync(`/home/claude/apps3/${app}/index.html`, 'utf8'), { runScripts: 'dangerously', url: 'https://x.test/' + hash, pretendToBeVisual: true, beforeParse(w) { w.scrollTo = () => {}; w.claude = { use: async (n) => (n === 'mcp' ? mcp : null) }; } }); dom.window.addEventListener('error', (e) => errs.push(app + ': ' + e.message)); await wait(1300); return dom.window; };
  const login = async (w, uid) => { const d = w.document; d.getElementById('lemail').value = w.eval(`userEmail(byId('Users','${uid}'))`); d.getElementById('lpass').value = 'x'; d.querySelector('form.lform').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); await wait(400); };
  const demo = (w) => [...w.document.querySelectorAll('.demoacct b')].map((b) => b.textContent).join(', ');
  // ---------- platform
  let w = await open('platform');
  console.log('PLATFORM | title:', w.document.title, '| heading:', w.document.querySelector('.hero h1')?.textContent, '| demo:', demo(w));
  await login(w, 'U2'); console.log('  dealer tries:', w.document.querySelector('.lform .note')?.textContent);
  await login(w, 'U1'); console.log('  in as', w.eval('S.role'), '| roles available:', w.eval('Object.keys(ROLE_DEF).join()'));
  w.eval("S.sel.dealer='DL1';go('dealers')"); await wait(300); w.document.querySelector('[data-a="supask"][data-id="DL1"]').click(); await wait(50);
  w.document.getElementById('supreason').value = 'Pricing question'; w.document.querySelector('[data-a="supstart"]').click(); await wait(700);
  const link1 = w.document.querySelector('.modal a.btn.pri')?.getAttribute('href'); console.log('  support link →', link1);
  // ---------- dealer opens the link
  w = await open('dealer', link1.slice(link1.indexOf('#')));
  console.log('DEALER via link | role', w.eval('S.role'), w.eval('S.acct'), '| banner:', w.document.querySelector('.supbar span')?.textContent.slice(0, 70));
  w.document.querySelector('[data-a="supend"]').click(); await wait(600); console.log('  ended →', w.document.querySelector('.lform .note')?.textContent, '| logged ended:', (await pg.query("select count(*) from core.support_sessions where ended_at is not null")).rows[0].count);
  w = await open('dealer', link1.slice(link1.indexOf('#'))); console.log('  reuse old link →', w.document.querySelector('.lform .note')?.textContent);
  w = await open('dealer'); console.log('DEALER | title:', w.document.title, '| demo:', demo(w));
  await login(w, 'U4'); console.log('  company user tries:', w.document.querySelector('.lform .note')?.textContent);
  await login(w, 'U2'); console.log('  in as', w.eval('S.role'), '| menu:', w.eval("ROLE_DEF.dealer.nav.map(x=>x[0]).join(' / ')"));
  w.eval("go('companies')"); await wait(300); w.document.querySelector('[data-a="supask"][data-id="C1"]').click(); await wait(50);
  w.document.getElementById('supreason').value = 'Ticket 1182'; w.document.querySelector('[data-a="supstart"]').click(); await wait(700);
  const link2 = w.document.querySelector('.modal a.btn.pri')?.getAttribute('href'); console.log('  support link →', link2);
  // ---------- customer opens the link
  w = await open('customer', link2.slice(link2.indexOf('#')));
  console.log('CUSTOMER via link | role', w.eval('S.role'), w.eval('S.acct'), '| product', w.eval('prodName()'), '| banner:', w.document.querySelector('.supbar span')?.textContent.slice(0, 60));
  w = await open('customer'); console.log('CUSTOMER | title:', w.document.title, '| entry points:', w.document.querySelectorAll('a.ep').length, '| demo count:', w.document.querySelectorAll('.demoacct').length);
  await login(w, 'U1'); console.log('  EIT staff tries:', w.document.querySelector('.lform .note')?.textContent);
  await login(w, 'U4'); console.log('  Company A →', w.eval('S.page'), [...w.document.querySelectorAll('.apptile b')].map((b) => b.textContent).join(', '));
  await pg.query("update core.dealers set support_access_until=null; update core.companies set support_access_until=null");
  console.log('ERRORS', errs.length ? errs : 'none'); await pg.end(); process.exit(0);
})().catch((e) => { console.log('FAIL', e.stack); process.exit(1); });
