/* Owner tool for representative unlock codes (hub API, ../api).

   ADMIN_TOKEN=... API=https://api.easygeez.com node scripts/rep-codes.mjs <cmd>

   add-rep  <REPID> <CC> "<name>"            add / update a representative
   rep-off  <REPID>                           deactivate a rep (their unused codes stop working)
   reps                                       list representatives
   mint     <REPID> <core|prayer|bundle> <count> [--uses N] [--days N]
                                              print new codes as CSV (shown ONCE; only hashes are stored)
   report                                     minted / redeemed per rep + package, and batches
   revoke   <batch>                           revoke every code in a batch

   The token is read from the environment and never printed. */
const API = (process.env.API || 'http://localhost:8788').replace(/\/$/, '')
const TOKEN = process.env.ADMIN_TOKEN
const [cmd, ...a] = process.argv.slice(2)
const flag = (name, d) => { const i = a.indexOf(name); return i === -1 ? d : Number(a[i + 1]) }

async function call(method, path, body) {
  if (!TOKEN) throw new Error('set ADMIN_TOKEN in the environment')
  const res = await fetch(API + path, { method, headers: { 'content-type': 'application/json', 'x-admin-token': TOKEN }, body: body ? JSON.stringify(body) : undefined })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${res.status} ${json.error || ''}`)
  return json
}

try {
  if (cmd === 'add-rep') console.log((await call('POST', '/api/admin/reps', { repId: a[0], country: a[1], name: a[2] || '' })).rep)
  else if (cmd === 'rep-off') console.log((await call('POST', '/api/admin/reps', { repId: a[0], active: false })).rep)
  else if (cmd === 'reps') console.table((await call('GET', '/api/admin/reps')).reps)
  else if (cmd === 'mint') {
    const r = await call('POST', '/api/admin/repcodes', { repId: a[0], pkg: a[1], count: Number(a[2]), maxUses: flag('--uses', 1), days: flag('--days', 0) })
    console.log('code,rep,package,batch')
    for (const c of r.codes) console.log(`${c},${a[0].toUpperCase()},${a[1]},${r.batch}`)
  } else if (cmd === 'report') {
    const r = await call('GET', '/api/admin/repcodes')
    console.table(r.report)
    console.table(r.batches.map(({ batch, repId, pkg, count, redeemed, maxUses, revoked, expiresAt }) => ({ batch, repId, pkg, count, redeemed, maxUses, revoked, expiresAt })))
  } else if (cmd === 'revoke') console.log(await call('POST', '/api/admin/repcodes/revoke', { batch: a[0] }))
  else { console.error('usage: see the header of scripts/rep-codes.mjs'); process.exit(1) }
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
