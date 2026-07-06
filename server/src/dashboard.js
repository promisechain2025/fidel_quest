/* Owner funnel dashboard. A self-contained page (no build step, no deps) the
   server hands out at /dashboard. It reads GET /api/stats with the owner token
   and draws the loop as a single-series funnel - magnitude across ordered
   stages - so one accent hue, baseline-anchored bars, per-stage conversion
   labels, recessive track, tabular figures. Light + dark aware. */

export function dashboardHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Fidel Quest - funnel</title>
<style>
  :root{
    --bg:#fdfaf3; --card:#fff; --ink:#2b2016; --muted:#8a7663; --line:#ecdfc9;
    --accent:#179061; --track:#eef3ee; --accent-ink:#0f6f49;
  }
  @media (prefers-color-scheme:dark){
    :root{ --bg:#111c33; --card:#1b2b4a; --ink:#eaf0fd; --muted:#a4b3d2; --line:#2e4166;
           --accent:#4ecf96; --track:#22335a; --accent-ink:#8ff0c4; }
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5}
  .wrap{max-width:760px;margin:0 auto;padding:28px 18px 64px}
  h1{font-size:1.4rem;font-weight:900;margin:0 0 2px}
  .sub{color:var(--muted);font-size:.85rem;margin:0 0 20px}
  .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:20px}
  input{flex:1;min-width:200px;padding:10px 12px;border:2px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);font:inherit}
  button{border:0;background:var(--accent);color:#fff;font-weight:800;padding:10px 16px;border-radius:12px;cursor:pointer}
  .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:24px}
  .tile{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 14px}
  .tile b{display:block;font-size:1.5rem;font-weight:900;font-variant-numeric:tabular-nums}
  .tile i{font-style:normal;font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
  .funnel{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px}
  .stage{margin:0 0 14px}
  .stage:last-child{margin-bottom:0}
  .stage .lab{display:flex;justify-content:space-between;font-size:.85rem;font-weight:700;margin-bottom:5px}
  .stage .lab .n{font-variant-numeric:tabular-nums;color:var(--muted)}
  .bar{height:22px;background:var(--track);border-radius:6px;overflow:hidden}
  .bar>span{display:block;height:100%;background:var(--accent);border-radius:6px;min-width:2px;transition:width .5s ease}
  .conv{font-size:.72rem;color:var(--accent-ink);font-weight:800;margin-left:6px;font-variant-numeric:tabular-nums}
  .err{color:#c0392b;font-weight:700}
  .muted{color:var(--muted);font-size:.8rem;margin-top:18px}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:.8rem}
  th,td{text-align:right;padding:6px 8px;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums}
  th:first-child,td:first-child{text-align:left}
</style>
</head>
<body>
<div class="wrap">
  <h1>Fidel Quest &middot; funnel</h1>
  <p class="sub">Anonymous aggregate counts. No child data. Enter the owner token to read.</p>
  <div class="row">
    <input id="tok" type="password" placeholder="owner token" autocomplete="off" />
    <button id="go">Load</button>
    <button id="refresh" title="Refresh">&#8635;</button>
  </div>
  <div id="out"></div>
</div>
<script>
  const STAGES = [
    ['app_open','App opens'],
    ['lesson_complete','Lessons done'],
    ['chapter_complete','Chapters done'],
    ['gift_claim','Gifts claimed'],
    ['share','Shares'],
    ['install','Installs'],
  ]
  const $ = (id) => document.getElementById(id)
  const tokInput = $('tok'), out = $('out')
  tokInput.value = sessionStorage.getItem('fq_owner_token') || (location.hash.match(/token=([^&]+)/)||[])[1] || ''

  function pct(n){ return n==null ? '' : Math.round(n*100)+'%' }
  function esc(s){ return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])) }

  async function load(){
    const token = tokInput.value.trim()
    if(!token){ out.innerHTML = '<p class="err">Enter the owner token.</p>'; return }
    sessionStorage.setItem('fq_owner_token', token)
    try{
      const res = await fetch('/api/stats',{ headers:{ 'x-owner-token': token } })
      if(res.status===403){ out.innerHTML='<p class="err">Wrong token (403).</p>'; return }
      if(!res.ok){ out.innerHTML='<p class="err">Error '+res.status+'.</p>'; return }
      render(await res.json())
    }catch(e){ out.innerHTML='<p class="err">'+esc(e.message)+'</p>' }
  }

  function render(data){
    const t = data.totals||{}
    const max = Math.max(1, t.app_open||0)
    const shareRate = t.app_open ? pct((t.share||0)/t.app_open) : '-'
    const installRate = t.app_open ? pct((t.install||0)/t.app_open) : '-'
    const funnelByType = Object.fromEntries((data.funnel||[]).map(f=>[f.type,f]))

    let bars = ''
    for(const [key,label] of STAGES){
      const f = funnelByType[key] || {count:0,rateFromPrev:null}
      const w = Math.round((f.count/max)*100)
      const conv = f.rateFromPrev==null ? '' : '<span class="conv">'+pct(f.rateFromPrev)+' of prev</span>'
      bars += '<div class="stage"><div class="lab"><span>'+label+conv+'</span><span class="n">'+(f.count||0)+'</span></div>'
           +  '<div class="bar"><span style="width:'+w+'%"></span></div></div>'
    }

    const days = Object.keys(data.daily||{}).sort().reverse().slice(0,7)
    let table = ''
    if(days.length){
      table = '<table><thead><tr><th>Day</th>'+STAGES.map(s=>'<th>'+s[1].split(' ')[0]+'</th>').join('')+'</tr></thead><tbody>'
        + days.map(d=>{ const r=data.daily[d]||{}; return '<tr><td>'+d+'</td>'+STAGES.map(s=>'<td>'+(r[s[0]]||0)+'</td>').join('')+'</tr>' }).join('')
        + '</tbody></table>'
    }

    out.innerHTML =
      '<div class="tiles">'
      + '<div class="tile"><b>'+(data.events||0)+'</b><i>total events</i></div>'
      + '<div class="tile"><b>'+shareRate+'</b><i>share rate</i></div>'
      + '<div class="tile"><b>'+installRate+'</b><i>install rate</i></div>'
      + '</div>'
      + '<div class="funnel">'+bars+'</div>'
      + table
      + '<p class="muted">Auto-refreshes every 30s. Counts reset on server restart (in-memory).</p>'
  }

  $('go').onclick = load
  $('refresh').onclick = load
  tokInput.addEventListener('keydown', e=>{ if(e.key==='Enter') load() })
  if(tokInput.value) load()
  setInterval(()=>{ if(tokInput.value) load() }, 30000)
</script>
</body>
</html>`
}
