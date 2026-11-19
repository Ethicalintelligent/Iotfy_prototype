const { JSDOM } = require('jsdom'); const fs = require('fs'); const { Client } = require('pg');
(async () => {
  const pg = new Client({ host: '/tmp/pgd', port: 5544, user: 'postgres', database: 'neontest' }); await pg.connect();
  const mcp = { callTool: async (s, tool, a) => { if (tool === 'run_sql') return { payload: JSON.stringify((await pg.query(a.sql)).rows) }; await pg.query('BEGIN'); try { for (const q of a.sql_statements) await pg.query(q); await pg.query('COMMIT'); return { payload: '[]' }; } catch (e) { await pg.query('ROLLBACK'); throw e; } } };
  const dom = new JSDOM(fs.readFileSync(process.argv[2], 'utf8'), { runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true, beforeParse(w) { w.scrollTo = () => {}; w.CSS = { escape: (x) => x }; w.claude = { use: async (n) => (n === 'mcp' ? mcp : null) }; } });
  const w = dom.window, d = w.document, errs = []; w.addEventListener('error', (e) => errs.push(e.message)); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(1200);
  // make a throwaway product to edit & delete
  const id = w.eval("(()=>{const r=upsert('Nodes',blank('Nodes',{Name:'REC-TEST',Type:'Product',Kind:'Standalone','Parent ID':'N002',Status:'Active'}));touch('Nodes');return r.ID})()"); await wait(700);
  w.eval(`S.role='platform';S.acct='PLATFORM';S.user='U1';S.sel.node='${id}';go('tree')`); await wait(500);
  const txt = (sel) => [...d.querySelectorAll(sel)].map((b) => b.textContent.trim());
  console.log('header buttons:', txt('.page > .ph button').join(' | '));
  console.log('where2:', d.body.innerHTML.match(/.{100}Edit \/ delete.{30}/)?.[0]);console.log('where:', [...d.querySelectorAll('button')].filter(b=>/Edit \/ delete/.test(b.textContent)).map(b=>b.outerHTML.slice(0,140)));console.log('record card buttons:', txt('.page .card button[data-a="editon"]').join(' | '), '| any "Edit / delete" left:', d.body.textContent.includes('Edit / delete'));
  d.querySelector('.card button[data-a="editon"]').click(); await wait(50);
  console.log('editing: card shows', txt('.receditbtns button').join(' | '), '| delete link:', txt('.recdel button').join(''), '| bottom bar hidden:', !!d.querySelector('.editbar.slim'));
  const c = d.querySelector(`.page [data-c="cell"][data-t="Nodes"][data-id="${id}"][data-k="Name"]`); c.value = 'REC-RENAMED'; c.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(50);
  console.log('after change: card shows', txt('.receditbtns button').join(' | '));
  d.querySelector('.receditbtns [data-a="editsave"]').click(); await wait(700);
  console.log('saved name in Neon:', (await pg.query(`select name from core.nodes where id='${id}'`)).rows[0]?.name, '| back to', txt('.card button[data-a="editon"]').join(''));
  d.querySelector('.card button[data-a="editon"]').click(); await wait(50); d.querySelector('.recdel button').click(); await wait(50);
  console.log('confirm dialog:', d.querySelector('.modal h2')?.textContent, '|', txt('.modal button').join(' | '));
  d.querySelector('[data-a="recdelyes"]').click(); await wait(800);
  console.log('deleted in Neon:', (await pg.query(`select count(*) from core.nodes where id='${id}'`)).rows[0].count === '0', '| editing', w.eval('S.editing'));
  // used record: delete blocked
  w.eval(`S.sel.node='N019';render()`); await wait(50); d.querySelector('.card button[data-a="editon"]').click(); await wait(50); d.querySelector('.recdel button').click(); await wait(50);
  console.log('used record:', d.querySelector('.modal .note')?.textContent.slice(0, 70), '|', txt('.modal button').join(' | '));
  d.querySelector('.modal [data-a="recdelno"]').click(); d.querySelector('[data-a="editcancel"]').click(); await wait(500);
  // modal-style record (Features) just says Edit
  w.eval(`S.sel.feat='F001';go('features')`); await wait(500); console.log('features page edit buttons:', w.eval('S.page'), txt('.page .card .row.sb button').slice(0, 2).join(' | '));
  console.log('ERRORS', errs.length ? errs : 'none'); await pg.end(); process.exit(0);
})();
