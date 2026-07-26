/* GET /admin - a single-file owner panel (server/dashboard.js pattern):
   the page itself is public but empty; every data call needs the
   ADMIN_TOKEN typed into the page (kept in sessionStorage only).
   Lists teacher applications / waitlist / contact and approves teachers
   into the public directory - no curl required. */
export const ADMIN_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>eGeez - owner panel</title>
<style>
  body{font-family:system-ui,sans-serif;background:#1b2233;color:#eae3d2;margin:0;padding:24px;max-width:900px;margin-inline:auto}
  h1{font-size:20px} h2{font-size:15px;margin:24px 0 8px;color:#e2c069}
  input,button{font:inherit;border-radius:8px;border:1px solid #3a4560;padding:8px 10px}
  input{background:#141a28;color:#eae3d2;width:280px}
  button{background:#e2c069;color:#241a05;font-weight:700;cursor:pointer;border:none}
  button.ghost{background:#2a3248;color:#eae3d2}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
  td,th{border-bottom:1px solid #3a4560;padding:6px 8px;text-align:left;vertical-align:top}
  .ok{color:#8fd15a}.muted{color:#9aa2ba}.pill{border:1px solid #3a4560;border-radius:99px;padding:1px 8px;font-size:11px}
</style></head><body>
<h1>eGeez - owner panel</h1>
<p class="muted">Paste the ADMIN_TOKEN, then Load. Approving a teacher publishes name, languages, subjects, and location (never email) to the public directory.</p>
<p><input id="tok" type="password" placeholder="ADMIN_TOKEN"> <button onclick="loadAll()">Load</button> <span id="msg" class="muted"></span></p>
<h2>Teacher applications</h2><div id="teachers"></div>
<h2>Waitlist</h2><div id="waitlist"></div>
<h2>Contact messages</h2><div id="contact"></div>
<script>
const tokEl = document.getElementById('tok')
tokEl.value = sessionStorage.getItem('egz.admin') || ''
const H = () => ({ 'x-admin-token': tokEl.value, 'content-type': 'application/json' })
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))
async function get(kind) {
  const r = await fetch('/api/admin/' + kind, { headers: H() })
  if (!r.ok) throw new Error(kind + ': ' + r.status)
  return (await r.json()).items
}
async function setStatus(id, status) {
  await fetch('/api/admin/teachers/' + id, { method: 'PATCH', headers: H(), body: JSON.stringify({ status }) })
  loadAll()
}
function table(rows, cols, actions) {
  if (!rows.length) return '<p class="muted">none yet</p>'
  return '<table><tr>' + cols.map((c) => '<th>' + c + '</th>').join('') + (actions ? '<th></th>' : '') + '</tr>'
    + rows.map((r) => '<tr>' + cols.map((c) => '<td>' + esc(Array.isArray(r[c]) ? r[c].join(', ') : r[c]) + '</td>').join('')
      + (actions ? '<td>' + actions(r) + '</td>' : '') + '</tr>').join('') + '</table>'
}
async function loadAll() {
  const msg = document.getElementById('msg')
  msg.textContent = 'loading...'
  try {
    sessionStorage.setItem('egz.admin', tokEl.value)
    const [teachers, waitlist, contact] = await Promise.all([get('teachers'), get('waitlist'), get('contact')])
    document.getElementById('teachers').innerHTML = table(teachers,
      ['name', 'email', 'languages', 'subjects', 'location', 'status'],
      (r) => r.status === 'approved'
        ? '<button class="ghost" onclick="setStatus(\\'' + r._id + '\\',\\'new\\')">unpublish</button>'
        : '<button onclick="setStatus(\\'' + r._id + '\\',\\'approved\\')">approve</button> '
          + '<button class="ghost" onclick="setStatus(\\'' + r._id + '\\',\\'archived\\')">archive</button>')
    document.getElementById('waitlist').innerHTML = table(waitlist, ['email', 'name', 'language', 'createdAt'])
    document.getElementById('contact').innerHTML = table(contact, ['name', 'email', 'message', 'createdAt'])
    msg.innerHTML = '<span class="ok">loaded</span>'
  } catch (e) { msg.textContent = e.message + ' (wrong token?)' }
}
</script></body></html>`
