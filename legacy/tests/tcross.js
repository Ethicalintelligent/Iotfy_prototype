// Two separate browsers on the same database: platform admin writes, dealer admin (another browser) sees it on next page change.
const { JSDOM } = require('jsdom'); const fs = require('fs'); const { Client } = require('pg');
const FILE = process.argv[2];
async function open(pg) {
  const mcp = { callTool: async (s, tool, a) => { if (tool === 'run_sql') return { payload: JSON.stringify((await pg.query(a.sql)).rows) }; await pg.query('BEGIN'); try { for (const q of a.sql_statements) await pg.query(q); await pg.query('COMMIT'); return { payload: '[]' }; } catch (e) { await pg.query('ROLLBACK'); throw e; } } };
  const dom = new JSDOM(fs.readFileSync(FILE, 'utf8'), { runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true, beforeParse(w) { w.scrollTo = () => {}; w.claude = { use: async (n) => (n === 'mcp' ? mcp : null) }; } });
  return dom.window;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const pg = new Client({ host: '/tmp/pgd', port: 5544, user: 'postgres', database: 'neontest' }); await pg.connect();
  const A = await open(pg), B = await open(pg); await wait(1200);
  A.eval("S.role='platform';S.acct='PLATFORM';S.user='U1';go('tree')"); B.eval("S.role='dealer';S.acct='DL1';go('home')"); await wait(400);
  // Platform admin: create (button action -> saves at once)
  const id = A.eval("(()=>{const r=upsert('Interfaces',blank('Interfaces',{Name:'CROSS-TEST'}));touch('Interfaces');return r.ID})()"); await wait(600);
  console.log('in Neon after create:', (await pg.query(`select count(*) from core.interfaces where id='${id}'`)).rows[0].count);
  console.log('dealer browser before page change:', !!B.eval(`byId('Interfaces','${id}')`));
  B.eval("go('interfaces')"); await wait(600);
  console.log('dealer browser after page change:', !!B.eval(`byId('Interfaces','${id}')`));
  // Dealer browser: update, then delete
  B.eval(`setField('Interfaces','${id}','Name','CROSS-UPDATED')`); await wait(600);
  A.eval("go('interfaces')"); await wait(600); console.log('platform sees update:', A.eval(`byId('Interfaces','${id}')?.Name`));
  B.eval(`removeRow('Interfaces','${id}')`); await wait(600);
  A.eval("go('tree')"); await wait(600); console.log('platform sees delete:', !A.eval(`byId('Interfaces','${id}')`));
  await pg.end(); process.exit(0);
})();
