/* Share landing page. A shared link that carries Open Graph + Twitter tags
   shows a rich preview card in WhatsApp / social, which lifts click-through
   far above a bare URL. It then bounces the visitor into the app (or offers
   the install). Pure string builder so it is trivially testable. */

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

export function landingHtml({ appUrl = 'https://fidelquest.app', ogImage } = {}) {
  const app = esc(appUrl)
  const img = esc(ogImage || `${appUrl.replace(/\/$/, '')}/icon-512.png`)
  const title = 'Fidel Quest - Learn the Amharic alphabet'
  const desc = "I'm learning the Amharic alphabet with Anbessa the lion cub! Free, offline, and made for kids."
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:image" content="${img}" />
<meta property="og:url" content="${app}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${img}" />
<meta http-equiv="refresh" content="0; url=${app}" />
<style>
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:linear-gradient(#fff3d6,#ffd98a);color:#7c3d00;
       min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:24px}
  h1{font-size:2rem;font-weight:900;margin:0}
  a.cta{background:#179061;color:#fff;font-weight:800;padding:14px 26px;border-radius:999px;text-decoration:none;box-shadow:0 4px 0 #0f6f49}
  img{width:120px;height:120px;border-radius:28px}
</style>
</head>
<body>
  <img src="${img}" alt="Fidel Quest" onerror="this.style.display='none'" />
  <h1>Fidel Quest</h1>
  <p>${esc(desc)}</p>
  <a class="cta" href="${app}">Open Fidel Quest</a>
  <noscript><p>Continue to <a href="${app}">${app}</a></p></noscript>
</body>
</html>`
}
