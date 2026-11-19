// Runs the built app in jsdom with a mock Neon connector that executes SQL on the local copy of the core DB.
const { JSDOM } = require('jsdom'); const fs = require('fs'); const { Client } = require('pg');
(async () => {
  const pg = new Client({ host: '/tmp/pgd', port: 5544, user: 'postgres', database: 'neontest' }); await pg.connect();
  const calls = [];
  const mcp = { callTool: async (server, tool, args) => {
    calls.push({ server, tool, n: (args.sql_statements || [args.sql]).length });
    if (server !== 'Neon') throw Object.assign(new Error('wrong server'), { code: 'tool_error' });
    if (tool === 'run_sql') { const r = await pg.query(args.sql); return { payload: JSON.stringify(r.rows) }; }
    if (tool === 'run_sql_transaction') { await pg.query('BEGIN'); try { const out = []; for (const s of args.sql_statements) out.push((await pg.query(s)).rows); await pg.query('COMMIT'); return { payload: JSON.stringify(out) }; } catch (e) { await pg.query('ROLLBACK'); throw Object.assign(new Error(e.message), { code: 'tool_error' }); } }
  } };
  const dom = new JSDOM(fs.readFileSync('/home/claude/app/index.html', 'utf8'), { runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true,
    beforeParse(w) { w.scrollTo = () => {}; w.claude = { use: async (n) => (n === 'mcp' ? mcp : null) }; } });
  const w = dom.window; const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const ev = (s) => { try { return w.eval(s); } catch (e) { errs.push(s.slice(0, 60) + ' => ' + e.message); } };
  await new Promise((r) => setTimeout(r, 400));
  ev('readSheet(true)'); await new Promise((r) => setTimeout(r, 800));
  console.log('sync:', ev('SYNC.state+" / "+SYNC.msg'), '| missing:', ev('SYNC.missing.join(",")'));
  console.log('rows:', ev('TABS.map(t=>t+"="+DB[t].length).join(" ")'));
  console.log('N004 default device:', ev("byId('Nodes','N004')['Default Device Model']"), '| D04 network:', ev("byId('Device_Models','D04').Network"), '| SIM:', ev("JSON.stringify(DB.SIM_Cards[0])"));
  console.log('Network lookup list:', ev("lookupOpts ? where('Lookups',l=>l.List==='Network').map(l=>l.Value).slice(0,4).join(', ') : ''"));
  // edits: rename a product, change default device, add a dealer, delete a lookup, toggle a yes/no
  ev(`byId('Nodes','N019').Name='GPS Asset Tracking (edited)';touch('Nodes');byId('Nodes','N019')['Default Device Model']='D02';
      upsert('Dealers',blank('Dealers',{Name:'Test Dealer KSA',Country:'Saudi Arabia',Status:'Active'}));
      byId('Interfaces','I06').Description='Serial RS-232 (edited)';touch('Interfaces');
      byId('Device_Models','D04').Network='Wi-Fi';touch('Device_Models');`);
  ev('saveSheet()'); await new Promise((r) => setTimeout(r, 800));
  const q = async (s) => (await pg.query(s)).rows;
  console.log('after save → node:', (await q("select name from core.nodes where id='N019'"))[0].name,
    '| pd1:', JSON.stringify(await q("select device_model_id from core.product_devices where product_id='N019' and priority=1")),
    '| dealers:', (await q('select count(*) c from core.dealers'))[0].c,
    '| I06 bus kept:', JSON.stringify(await q("select description,bus from core.interfaces where id='I06'")),
    '| D04 net:', (await q("select network,server_configured from core.device_models where id='D04'")).map(r=>r.network+'/'+r.server_configured)[0],
    '| network lookups in core:', (await q("select count(*) c from core.lookups where list='Network'"))[0].c, '| dirty:', ev('DIRTY.size'));
  // FK violation: delete a device model in use, expect a refusal and DIRTY kept
  ev("DB.Device_Models=DB.Device_Models.filter(r=>r.ID!=='D01');touch('Device_Models')"); ev('saveSheet()'); await new Promise((r) => setTimeout(r, 600));
  console.log('FK guard: D01 still in core:', (await q("select count(*) c from core.device_models where id='D01'"))[0].c, '| dirty kept:', ev('DIRTY.size'), '| toast:', w.document.getElementById('toast')?.textContent.slice(0,90));
  // reload from db round-trip
  ev('DIRTY.clear();readSheet(true)'); await new Promise((r) => setTimeout(r, 600));
  console.log('reload: N019', ev("byId('Nodes','N019').Name"), '| dd', ev("byId('Nodes','N019')['Default Device Model']"), '| D04', ev("byId('Device_Models','D04').Network"));
  for (const [r, a] of Object.entries({ platform: 'PLATFORM', dealer: 'DL1', company: 'C1', fleet: 'U6' })) { ev(`S.role='${r}';S.acct='${a}';S.page='';render()`);
    for (const p of ev(`ROLE_DEF['${r}'].nav.flatMap(x=>x[1].map(y=>y[0]))`)) { ev(`go('${p}')`); const txt = w.document.getElementById('app').textContent; if (/undefined|NaN|\[object/.test(txt)) errs.push(`${r}/${p}: ` + (txt.match(/.{30}(undefined|NaN|\[object).{20}/) || [''])[0]); } }
  console.log('calls:', JSON.stringify(calls)); console.log('ERRORS', errs.length ? errs : 'none'); await pg.end(); process.exit(0);
})();
