/* One self-contained page for sign-in, the admin console and the rep
   dashboard. All data comes from /api/*; everything rendered is escaped. */
export const PAGE = String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>eGeez Representatives</title>
<style>
:root{--ink:#1d2433;--muted:#667085;--line:#e4e7ec;--bg:#f6f4ee;--card:#fff;--go:#1f8a5b;--go2:#16704a;--warn:#b54708;--bad:#b42318;--chip:#eef4ff}
*{box-sizing:border-box}body{margin:0;font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink);background:var(--bg)}
header{display:flex;align-items:center;gap:12px;padding:14px 22px;background:#123c2c;color:#fff}
header b{font-size:18px}header .sp{flex:1}header button{background:transparent;color:#fff;border:1px solid #ffffff66}
main{max-width:1100px;margin:0 auto;padding:20px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;margin-bottom:16px}
h2{margin:0 0 12px;font-size:18px}h3{margin:0 0 8px;font-size:15px}
button,.btn{font:inherit;border:1px solid var(--line);background:#fff;border-radius:9px;padding:7px 12px;cursor:pointer;color:var(--ink);text-decoration:none;display:inline-block}
button.p{background:var(--go);border-color:var(--go2);color:#fff;font-weight:600}button.d{color:var(--bad)}
input,select{font:inherit;padding:8px 10px;border:1px solid #d0d5dd;border-radius:9px;background:#fff;min-width:0}
label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;align-items:end}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line);vertical-align:middle}
th{color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.03em}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em}
.tag{display:inline-block;padding:2px 8px;border-radius:99px;font-size:12px;font-weight:600}
.unused{background:#ecfdf3;color:#067647}.used{background:#f2f4f7;color:#475467}.void{background:#fef3f2;color:var(--bad)}
.test{background:#fffaeb;color:var(--warn);border:1px dashed #fdb022}
.tabs{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}.tabs button.on{background:#123c2c;color:#fff;border-color:#123c2c}
.stats{display:flex;gap:12px;flex-wrap:wrap}.stat{flex:1;min-width:120px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.stat b{display:block;font-size:26px}.stat span{color:var(--muted);font-size:13px}
.msg{padding:10px 12px;border-radius:9px;margin:10px 0}.ok{background:#ecfdf3;color:#067647}.err{background:#fef3f2;color:var(--bad)}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.muted{color:var(--muted)}
.login{max-width:380px;margin:60px auto}
</style></head><body>
<header><b>eGeez</b><span>Representatives</span><span class="sp"></span><span id="who"></span><button id="out" hidden>Sign out</button></header>
<main id="m"></main>
<script>
const $=(s,r=document)=>r.querySelector(s), m=$('#m')
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const PK={core:'Full course',prayer:'Prayer Book',bundle:'Full course + Prayer Book'}
const d=s=>s?new Date(s).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):''
async function api(p,o={}){const r=await fetch(p,{credentials:'same-origin',...o,headers:{'content-type':'application/json'},body:o.body&&JSON.stringify(o.body)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||j.message||('Error '+r.status));return j}
const tag=c=>'<span class="tag '+c.status+'">'+c.status+'</span>'+(c.test?' <span class="tag test">TEST</span>':'')
const dv=c=>c.status==='used'?'<span class="mono">devices: '+(c.devices||0)+'/'+(c.maxDevices||2)+'</span>'+(c.lastRestoreAt?'<br><span class="muted">restored '+d(c.lastRestoreAt)+'</span>':''):'';
const share=c=>'Your eGeez unlock code ('+PK[c.pkg]+'):\n'+c.code+'\n\nOpen https://easygeez.com/app on this phone, tap Grown-Ups, then "Code from an eGeez representative" and type the code. Keep this code. You can use it again if you change phone (up to 2 devices).'
function stats(t){return '<div class="stats"><div class="stat"><b>'+t.issued+'</b><span>Issued</span></div><div class="stat"><b>'+t.used+'</b><span>Used</span></div><div class="stat"><b>'+t.unused+'</b><span>Unused</span></div>'+(t.void?'<div class="stat"><b>'+t.void+'</b><span>Voided</span></div>':'')+'</div>'}
window.cp=async(code,btn)=>{try{await navigator.clipboard.writeText(code);btn.textContent='Copied'}catch{prompt('Copy the code',code)}}
window.wa=(i)=>{const c=window._codes[i];const t=share(c);if(navigator.share&&/Mobi/.test(navigator.userAgent))navigator.share({text:t}).catch(()=>{});else open('https://wa.me/?text='+encodeURIComponent(t),'_blank','noopener')}

function login(step,email,msg){
  m.innerHTML='<div class="card login"><h2>Sign in</h2><p class="muted">No password. We email you a 6-digit code.</p>'+(msg?'<div class="msg '+msg[0]+'">'+E(msg[1])+'</div>':'')+
  (step===1?'<form id="f"><label>Email<input id="e" type="email" required autocomplete="email" value="'+E(email||'')+'"></label><p><button class="p">Email me a code</button></p></form>'
  :'<form id="f"><p>We sent a code to <b>'+E(email)+'</b> if it belongs to an eGeez representative.</p><label>6-digit code<input id="c" inputmode="numeric" maxlength="6" required autocomplete="one-time-code"></label><p class="row"><button class="p">Sign in</button><button type="button" id="b">Use another email</button></p></form>')+'</div>'
  $('#f').onsubmit=async e=>{e.preventDefault();try{
    if(step===1){const em=$('#e').value.trim();await api('/api/auth/start',{method:'POST',body:{email:em}});login(2,em)}
    else{await api('/api/auth/verify',{method:'POST',body:{email,code:$('#c').value}});boot()}
  }catch(x){login(step,email,['err',x.message])}}
  if(step===2)$('#b').onclick=()=>login(1,email)
}

async function repView(f){
  const j=await api('/api/rep/codes'+(f?'?status='+f:''));window._codes=j.codes
  const r=j.rep
  m.innerHTML='<div class="card"><h2>'+E(r.name)+' <span class="muted mono">'+E(r.repId)+'</span></h2><p class="muted">'+E([r.city,r.country].filter(Boolean).join(', '))+'</p>'+stats(j.totals)+'</div>'+
  '<div class="card"><div class="row" style="justify-content:space-between"><h2>My codes</h2><div class="tabs">'+['','unused','used'].map(s=>'<button data-f="'+s+'" class="'+((f||'')===s?'on':'')+'">'+(s||'All')+'</button>').join('')+'</div></div>'+
  (j.codes.length?'<table><tr><th>Code</th><th>Package</th><th>Created</th><th>Status</th><th>Used</th><th>Device / household</th><th>Devices</th><th></th></tr>'+j.codes.map((c,i)=>'<tr><td class="mono">'+E(c.code)+'</td><td>'+E(PK[c.pkg])+'</td><td>'+d(c.createdAt)+'</td><td>'+tag(c)+'</td><td>'+d(c.usedAt)+'</td><td class="mono">'+E(c.household)+'</td><td data-dev>'+dv(c)+'</td><td class="row">'+(c.status==='unused'?'<button onclick="cp(\''+E(c.code)+'\',this)">Copy</button><button onclick="wa('+i+')">Share on WhatsApp</button>':'')+'</td></tr>').join('')+'</table>':'<p class="muted">No codes here yet. eGeez will add codes for you.</p>')+'</div>'
  m.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>repView(b.dataset.f))
}

let tab='reps',edit=null,last=null,cf={}
async function adminView(msg){
  const tabs='<div class="tabs">'+[['reps','Representatives'],['gen','Generate codes'],['codes','All codes'],['tot','Totals']].map(([k,l])=>'<button data-t="'+k+'" class="'+(tab===k?'on':'')+'">'+l+'</button>').join('')+'</div>'
  const R=await api('/api/admin/reps'); const reps=R.reps
  let h=''
  if(tab==='reps'){
    const v=edit||{}
    h='<div class="card"><h2>'+(edit?'Edit '+E(v.repId):'Add a representative')+'</h2><form id="rf" class="grid">'+
    [['repId','Rep ID (e.g. ET01)'],['name','Name'],['country','Country (ET, ER, UG...)'],['city','City'],['phone','Phone'],['whatsapp','WhatsApp'],['email','Email (sign-in)']].map(([k,l])=>'<label>'+l+'<input name="'+k+'" value="'+E(v[k]||'')+'"'+(k==='repId'&&edit?' readonly':'')+'></label>').join('')+
    '<label><span><input type="checkbox" name="shown" '+(v.shown?'checked':'')+'> Show on website</span><span><input type="checkbox" name="active" '+(v.active!==false?'checked':'')+'> Active</span><span><input type="checkbox" name="test" '+(v.test?'checked':'')+'> Test data (easy to delete)</span></label>'+
    '<div class="row"><button class="p">'+(edit?'Save':'Add')+'</button>'+(edit?'<button type="button" id="cx">Cancel</button>':'')+'</div></form></div>'+
    '<div class="card"><h2>Representatives</h2><table><tr><th>ID</th><th>Name</th><th>Place</th><th>Contact</th><th>Website</th><th>Status</th><th>Codes (used / issued)</th><th></th></tr>'+
    reps.map(r=>{const t=R.totals.find(x=>x.repId===r.repId)||{};return '<tr><td class="mono">'+E(r.repId)+'</td><td>'+E(r.name)+(r.test?' <span class="tag test">TEST</span>':'')+'</td><td>'+E([r.city,r.country].filter(Boolean).join(', '))+'</td><td>'+E(r.phone||'')+(r.whatsapp?'<br>WA '+E(r.whatsapp):'')+'<br><span class="muted">'+E(r.email||'')+'</span></td><td>'+(r.shown?'Shown':'<span class="muted">Hidden</span>')+'</td><td>'+(r.active?'<span class="tag unused">active</span>':'<span class="tag void">disabled</span>')+'</td><td>'+(t.used||0)+' / '+(t.issued||0)+'</td><td><button data-e="'+E(r.repId)+'">Edit</button></td></tr>'}).join('')+'</table></div>'
  }
  if(tab==='gen'){
    h='<div class="card"><h2>Generate codes</h2><form id="gf" class="grid"><label>Representative<select name="repId">'+reps.filter(r=>r.active).map(r=>'<option value="'+E(r.repId)+'">'+E(r.repId+' - '+r.name)+'</option>').join('')+'</select></label><label>Package<select name="pkg"><option value="core">Full course (core)</option><option value="prayer">Prayer Book</option><option value="bundle">Bundle: course + prayer</option></select></label><label>Quantity<input name="quantity" type="number" min="1" max="500" value="10"></label><div><button class="p">Generate</button></div></form><p class="muted">Each code works once. Codes appear on the rep\'s dashboard right away.</p></div>'
    if(last)h+='<div class="card"><h2>New batch '+E(last.batch)+' ('+last.codes.length+')</h2><table><tr><th>Code</th><th>Package</th><th>Status</th></tr>'+last.codes.map(c=>'<tr><td class="mono">'+E(c.code)+'</td><td>'+E(PK[c.pkg])+'</td><td>'+tag(c)+'</td></tr>').join('')+'</table></div>'
  }
  if(tab==='codes'){
    const q=new URLSearchParams(Object.entries(cf).filter(([,v])=>v)).toString()
    const C=await api('/api/admin/codes'+(q?'?'+q:''))
    h='<div class="card"><div class="row" style="justify-content:space-between"><h2>All codes</h2><div class="row"><select id="fr"><option value="">All reps</option>'+reps.map(r=>'<option '+(cf.repId===r.repId?'selected':'')+' value="'+E(r.repId)+'">'+E(r.repId)+'</option>').join('')+'</select><select id="fs">'+['','unused','used','void'].map(s=>'<option '+((cf.status||'')===s?'selected':'')+' value="'+s+'">'+(s||'Any status')+'</option>').join('')+'</select><a class="btn" href="/api/admin/codes.csv'+(q?'?'+q:'')+'">Export CSV</a></div></div>'+stats(C.totals)+
    '<table style="margin-top:12px"><tr><th>Code</th><th>Rep</th><th>Package</th><th>Created</th><th>Status</th><th>Used</th><th>Household</th><th>Devices</th><th></th></tr>'+C.codes.map(c=>'<tr><td class="mono">'+E(c.code)+'</td><td class="mono">'+E(c.repId)+'</td><td>'+E(PK[c.pkg])+'</td><td>'+d(c.createdAt)+'</td><td>'+tag(c)+'</td><td>'+d(c.usedAt)+'</td><td class="mono">'+E(c.household)+'</td><td data-dev>'+dv(c)+'</td><td>'+(c.status==='unused'?'<button class="d" data-v="'+E(c.code)+'">Void</button>':'')+(c.status==='used'&&c.devices?'<button data-rd="'+E(c.code)+'">Reset devices</button>':'')+'</td></tr>').join('')+'</table></div>'
  }
  if(tab==='tot'){
    const t=R.totals,s=t.reduce((a,x)=>({issued:a.issued+x.issued,used:a.used+x.used,unused:a.unused+x.unused,void:a.void+x.void}),{issued:0,used:0,unused:0,void:0})
    h='<div class="card"><div class="row" style="justify-content:space-between"><h2>Totals per representative</h2><a class="btn" href="/api/admin/totals.csv">Export CSV</a></div>'+stats(s)+'<table style="margin-top:12px"><tr><th>Rep</th><th>Name</th><th>Issued</th><th>Used</th><th>Unused</th><th>Voided</th></tr>'+t.map(x=>'<tr><td class="mono">'+E(x.repId)+'</td><td>'+E(x.name)+(x.test?' <span class="tag test">TEST</span>':'')+'</td><td>'+x.issued+'</td><td>'+x.used+'</td><td>'+x.unused+'</td><td>'+x.void+'</td></tr>').join('')+'</table></div>'
  }
  m.innerHTML=tabs+(msg?'<div class="msg '+msg[0]+'">'+E(msg[1])+'</div>':'')+h
  m.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tab=b.dataset.t;edit=null;adminView()})
  m.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{edit=reps.find(r=>r.repId===b.dataset.e);adminView()})
  m.querySelectorAll('[data-v]').forEach(b=>b.onclick=async()=>{if(!confirm('Void '+b.dataset.v+'? It will stop working.'))return;try{await api('/api/admin/void',{method:'POST',body:{code:b.dataset.v}});adminView(['ok','Voided '+b.dataset.v])}catch(x){adminView(['err',x.message])}})
  m.querySelectorAll('[data-rd]').forEach(b=>b.onclick=async()=>{if(!confirm('Reset devices for '+b.dataset.rd+'? The code stays used (one sale); the family can enter it again on up to 2 devices.'))return;try{await api('/api/admin/reset-devices',{method:'POST',body:{code:b.dataset.rd}});adminView(['ok','Devices reset for '+b.dataset.rd])}catch(x){adminView(['err',x.message])}})
  const rf=$('#rf');if(rf){if($('#cx'))$('#cx').onclick=()=>{edit=null;adminView()};rf.onsubmit=async e=>{e.preventDefault();const f=new FormData(rf),b=Object.fromEntries(f);b.shown=f.has('shown');b.active=f.has('active');b.test=f.has('test');try{await api('/api/admin/reps',{method:edit?'PUT':'POST',body:b});const w=edit?'Saved':'Added';edit=null;adminView(['ok',w+' '+b.repId.toUpperCase()])}catch(x){adminView(['err',x.message])}}}
  const gf=$('#gf');if(gf)gf.onsubmit=async e=>{e.preventDefault();try{last=await api('/api/admin/generate',{method:'POST',body:Object.fromEntries(new FormData(gf))});adminView(['ok','Made '+last.codes.length+' codes'])}catch(x){adminView(['err',x.message])}}
  const fr=$('#fr');if(fr){fr.onchange=()=>{cf.repId=fr.value;adminView()};$('#fs').onchange=()=>{cf.status=$('#fs').value;adminView()}}
}

async function boot(){
  const {user}=await api('/api/me').catch(()=>({user:null}))
  $('#out').hidden=!user;$('#who').textContent=user?(user.role==='admin'?'Admin · ':'Rep '+user.repId+' · ')+user.email:''
  if(!user)return login(1)
  if(user.role==='admin'){if(location.pathname!=='/admin')history.replaceState(0,'','/admin');adminView()}
  else{if(location.pathname!=='/rep')history.replaceState(0,'','/rep');repView()}
}
$('#out').onclick=async()=>{await api('/api/auth/logout',{method:'POST'});boot()}
boot().catch(x=>{m.innerHTML='<div class="msg err">'+E(x.message)+'</div>'})
</script></body></html>`
