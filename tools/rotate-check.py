#!/usr/bin/env python3
"""Rotation / resize check for every eGeez screen (Playwright; real Chrome or WebKit).

For each screen and each device pair it opens the screen in one orientation,
then live-resizes the viewport portrait -> landscape -> portrait (like a kid
turning the tablet, even mid-animation) and checks after every step:

  hscroll     the page scrolls sideways
  offscreen-x a tap target sticks out of the viewport sideways
  offscreen-y a tap target is below/above the viewport with no way to scroll to it
  clipped     a tap target is cut off by an overflow:hidden ancestor
  covered     a tap target in view is covered by something that is not part of it
  tiny        a tap target smaller than 24px
  state       the screen changed (different top-level test id / reverted to home)
  blank       the screen is empty

and writes <out>/rotate.json, <out>/rotate.md (pass/fail table) and one montage PNG
per screen (rows = device pairs, columns = start / rotated / rotated back).

  python3 tools/rotate-check.py http://localhost:5251/ /tmp/rot [shots]
  SCREENS=home,wordbricks  PAIRS=390x844,1280x800  ROT_BROWSER=webkit  python3 tools/rotate-check.py ...
"""
import importlib.util, json, os, re, sys
from playwright.sync_api import sync_playwright
from PIL import Image

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5251/'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/rot'
SHOTS = len(sys.argv) > 3 and sys.argv[3] == 'shots'
SHOT_DIR = '/workspace/egeez-brick-samples/shots'
BROWSER = os.environ.get('ROT_BROWSER', 'chrome')

# (start W,H) -> rotated (W,H). Phones/tablets rotate, desktops/splits narrow and widen.
PAIRS = {
    '320x568': (320, 568, 568, 320), '360x640': (360, 640, 640, 360), '375x667': (375, 667, 667, 375),
    '390x844': (390, 844, 844, 390), '430x932': (430, 932, 932, 430),
    '568x320': (568, 320, 320, 568), '844x390': (844, 390, 390, 844),
    '768x1024': (768, 1024, 1024, 768), '820x1180': (820, 1180, 1180, 820),
    '1280x800': (1280, 800, 500, 800), '1920x1080': (1920, 1080, 700, 1080),
}

spec = importlib.util.spec_from_file_location('la', os.path.join(os.path.dirname(__file__), 'lang-audit-check.py'))
la = importlib.util.module_from_spec(spec)
sys.argv_saved, sys.argv = sys.argv, ['x', URL, OUT]
spec.loader.exec_module(la)
sys.argv = sys.argv_saved
la.URL = URL

WORDS = {'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
         'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
         'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90}


def parse_words(s):
    return sum(WORDS.get(w, 0) for w in re.split(r'[\s-]+', s.lower().strip()))


def goto(pg, q='?unlock'):
    pg.goto(URL + q); pg.wait_for_timeout(2200)


def bp_tile(pg, label):
    goto(pg)
    pg.get_by_role('button', name='Open backpack').click(); pg.wait_for_timeout(400)
    a = pg.get_by_role('button', name=re.compile('^All letters'))
    if a.count():
        a.first.click(force=True); pg.wait_for_timeout(400)
    t = pg.locator('[aria-modal=true] button').filter(has_text=re.compile(label)).first
    if not t.count():
        return False
    t.evaluate("e=>e.scrollIntoView({block:'center'})"); t.click(force=True); pg.wait_for_timeout(1200)
    return True


def open_home(pg):
    goto(pg); return True


def open_setup(pg):
    pg.goto(URL + '?unlock'); pg.wait_for_timeout(1200)
    if pg.get_by_role('button', name='Next').count() == 0:  # a fresh install: wipe state and look again
        pg.evaluate('localStorage.clear(); sessionStorage.clear()'); pg.goto(URL); pg.wait_for_timeout(2200)
    return pg.get_by_role('button', name='Next').count() > 0


def open_profile(pg):
    goto(pg); b = pg.get_by_role('button', name=re.compile('Change player')).first
    if not b.count(): return False
    b.click(force=True); pg.wait_for_timeout(900); return True


def open_gift(pg):
    goto(pg); b = pg.get_by_role('button', name=re.compile("Open Anbessa's gift")).first
    if not b.count(): return False
    b.click(force=True); pg.wait_for_timeout(900); return True


def open_language(pg):
    goto(pg); b = pg.get_by_role('button', name='Language').first
    if not b.count(): return False
    b.click(force=True); pg.wait_for_timeout(900); return True


def open_gate_hold(pg):
    if not bp_tile(pg, r'^Parents\s*$'): return False
    return pg.get_by_role('button', name=re.compile('Hold me')).count() > 0


def open_gate_type(pg):
    if not open_gate_hold(pg): return False
    b = pg.get_by_role('button', name=re.compile('Hold me')).first.bounding_box()
    pg.mouse.move(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2); pg.mouse.down(); pg.wait_for_timeout(2400); pg.mouse.up()
    pg.wait_for_timeout(500)
    return pg.locator('[data-testid=gate-words]').count() > 0


def open_grownups(pg):
    if not open_gate_type(pg): return False
    en = pg.get_by_role('button', name='English')
    if en.count():
        en.first.click(); pg.wait_for_timeout(300)
    n = parse_words(pg.locator('[data-testid=gate-words]').inner_text())
    for ch in str(n):
        pg.get_by_role('button', name=ch, exact=True).first.click()
    pg.get_by_role('button', name='OK').click(); pg.wait_for_timeout(1500)
    return pg.locator('[data-testid=gate-words]').count() == 0


def open_la(name):
    how, arg = la.GAMES[name]
    return lambda pg: la.open_game(pg, how, arg)


EXTRA = {
    'home': open_home, 'setup': open_setup, 'profile': open_profile, 'gift': open_gift, 'language': open_language,
    'gate-hold': open_gate_hold, 'gate-type': open_gate_type, 'grownups': open_grownups,
    'order': lambda pg: bp_tile(pg, r'^Order\s*$'), 'familyvoice': lambda pg: bp_tile(pg, r'^Family Voice\s*$'),
}
SCREENS = {**{k: open_la(k) for k in la.GAMES}, **EXTRA}

CHECK_JS = r"""(ins) => {
  const W = innerWidth, H = innerHeight, de = document.documentElement, out = []
  if (Math.max(de.scrollWidth, document.body.scrollWidth) > W + 1) out.push('hscroll ' + Math.max(de.scrollWidth, document.body.scrollWidth) + '>' + W)
  const pageScrolls = de.scrollHeight > H + 1
  const vis = (e) => { try { return e.checkVisibility({ opacityProperty: true, visibilityProperty: true }) } catch (_) { return e.offsetParent !== null } }
  const els = [...document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,[role=button]')].filter(vis)
  const seen = new Set()
  const note = (k, e, extra) => { const key = k + (e.getAttribute('aria-label') || e.innerText || e.tagName).trim().slice(0, 24); if (seen.has(key)) return; seen.add(key); out.push(k + ' [' + (e.getAttribute('aria-label') || e.innerText || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 28) + '] ' + (extra || '')) }
  const inScrollable = (e, axis) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); const ov = axis === 'x' ? cs.overflowX : cs.overflowY; if ((ov === 'auto' || ov === 'scroll') && (axis === 'x' ? a.scrollWidth > a.clientWidth + 1 : a.scrollHeight > a.clientHeight + 1)) return true } return false }
  const fixedAnc = (e) => { for (let a = e; a && a !== document.documentElement; a = a.parentElement) if (getComputedStyle(a).position === 'fixed') return true; return false }
  for (const e of els) {
    const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue
    if ((r.width < 24 || r.height < 24) && getComputedStyle(e, '::before').content === 'none') { if (!(e.tagName === 'INPUT' && e.type === 'range')) note('tiny', e, Math.round(r.width) + 'x' + Math.round(r.height)) }
    if ((r.right > W + 2 || r.left < -2) && !inScrollable(e, 'x')) note('offscreen-x', e, Math.round(r.left) + '..' + Math.round(r.right) + ' of ' + W)
    if ((r.bottom > H + 2 || r.top < -2) && !inScrollable(e, 'y') && (!pageScrolls || fixedAnc(e))) note('offscreen-y', e, Math.round(r.top) + '..' + Math.round(r.bottom) + ' of ' + H)
    // clipped by an overflow-hidden ancestor that cannot scroll
    for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a); if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue
      const ar = a.getBoundingClientRect(); const hid = (o) => o === 'hidden' || o === 'clip'
      const cx = hid(cs.overflowX) && (r.left < ar.left - 3 || r.right > ar.right + 3) && !inScrollable(e, 'x'), cy = hid(cs.overflowY) && (r.top < ar.top - 3 || r.bottom > ar.bottom + 3) && !inScrollable(e, 'y')
      if ((cx || cy) && r.left < W && r.right > 0 && r.top < H && r.bottom > 0) { note('clipped', e, 'by ' + (a.getAttribute('data-testid') || a.className.toString().slice(0, 30))); break }
    }
    // under the notch / dynamic island / home indicator (only with SAFE=1)
    if (ins && !inScrollable(e, 'y') && !inScrollable(e, 'x') && (r.top < ins.top - 2 || r.bottom > H - ins.bottom + 2 || r.left < ins.left - 2 || r.right > W - ins.right + 2) && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W) {
      const side = r.top < ins.top - 2 ? 'top' : r.bottom > H - ins.bottom + 2 ? 'bottom' : r.left < ins.left - 2 ? 'left' : 'right'
      if (fixedAnc(e) || side === 'left' || side === 'right' || !pageScrolls || r.top < ins.top - 2 && window.scrollY === 0) note('unsafe-' + side, e, Math.round(r.top) + ',' + Math.round(r.left) + ' inset ' + JSON.stringify(ins))
    }
    // covered: centre of a visible tap target is hit by something else
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    if (cx > 0 && cy > 0 && cx < W && cy < H) {
      const hit = document.elementFromPoint(cx, cy)
      if (hit && !e.contains(hit) && !hit.contains(e) && !['HEAD', 'HTML', 'BODY'].includes(hit.tagName)) {
        const hf = fixedAnc(hit) || getComputedStyle(hit).position === 'sticky'
        if (!(hf && pageScrolls)) note('covered', e, 'by ' + (hit.getAttribute('data-testid') || hit.tagName + '.' + hit.className.toString().slice(0, 24)))
      }
    }
  }
  const root = document.getElementById('root')
  if (!root || root.innerText.trim().length < 2 && !root.querySelector('img,svg,canvas')) out.push('blank')
  const tid = (document.querySelector('[aria-modal=true] [data-testid], [data-testid]') || {}).getAttribute?.('data-testid') || ''
  return { W, H, issues: out, tid, sw: de.scrollWidth, geez: [...new Set((root ? root.innerText : '').match(/[ሀ-ቈቊ-ዐዒ-ፚ]+/g) || [])].slice(0, 12) }
}"""


SAFE = os.environ.get('SAFE') == '1'


def insets(w, h):
    if max(w, h) >= 1100:
        return None
    return {'top': 47, 'bottom': 34, 'left': 0, 'right': 0} if h > w else {'top': 0, 'bottom': 21, 'left': 47 if w >= 780 else 0, 'right': 47 if w >= 780 else 0}  # notch phones are >= ~780 wide sideways


def sig(pg, cdp=None):
    ins = None
    if SAFE and cdp is not None:
        v = pg.viewport_size; ins = insets(v['width'], v['height'])
        cdp.send('Emulation.setSafeAreaInsetsOverride', {'insets': ins or {'top': 0, 'left': 0, 'bottom': 0, 'right': 0}})
        pg.wait_for_timeout(120)
    return pg.evaluate(CHECK_JS, ins)


def new_ctx(b, W, H, mobile):
    kw = dict(viewport={'width': W, 'height': H}, locale='en-US')
    if BROWSER == 'chrome':
        kw.update(is_mobile=mobile, has_touch=mobile)
    elif mobile:
        kw.update(has_touch=True)
    c = b.new_context(**kw); c.set_default_timeout(8000); return c


def montage(frames, path, rows):
    # frames: list of rows, each a list of 3 PNG paths
    th = 420
    ims = []
    for row in frames:
        r = []
        for f in row:
            im = Image.open(f).convert('RGB'); s = th / im.height
            r.append(im.resize((max(1, int(im.width * s)), th)))
        ims.append(r)
    wmax = max(sum(i.width for i in r) + 8 * (len(r) - 1) for r in ims)
    M = Image.new('RGB', (wmax, th * len(ims) + 8 * (len(ims) - 1)), (30, 30, 40))
    y = 0
    for r in ims:
        x = 0
        for i in r:
            M.paste(i, (x, y)); x += i.width + 8
        y += th + 8
    M.save(path)


def run_one(b, name, opener, pair, start_landscape, pack, results, tmp, frames):
    key = pair if not start_landscape else f'{pair}L'
    sw, sh, rw, rh = PAIRS[pair]
    if start_landscape: sw, sh, rw, rh = rw, rh, sw, sh
    mobile = max(sw, sh) < 1100
    ctx = new_ctx(b, sw, sh, mobile)
    ctx.add_init_script("(()=>{ if(!sessionStorage.getItem('__s')){ sessionStorage.setItem('__s','1'); localStorage.setItem('fq.pack','%s'); }})()" % pack)
    pg = ctx.new_page(); pg.on('dialog', lambda d: d.accept())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:80]))
    cdp = ctx.new_cdp_session(pg) if (SAFE and BROWSER == 'chrome') else None
    row = []; rec = {'screen': name, 'pair': key, 'opened': False, 'steps': [], 'errors': errs}
    try:
        if name == 'setup':
            ctx.add_init_script("localStorage.removeItem('fq.pack'); localStorage.removeItem('fq.lang')")
        rec['opened'] = bool(opener(pg))
        if not rec['opened']:
            rec['steps'].append({'issues': ['NOT OPENED']}); results.append(rec); return
        pg.wait_for_timeout(500)
        steps = [('start', sw, sh), ('rotated', rw, rh), ('back', sw, sh)]
        base = None
        for i, (lbl, w, h) in enumerate(steps):
            if i: pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(350 if lbl == 'rotated' else 600)
            s = sig(pg, cdp)
            if name == 'catch':  # letters fall past the head by design; that is not a covered control
                s['issues'] = [i for i in s['issues'] if not i.startswith('covered')]
            if base is None: base = s['tid']
            elif s['tid'] != base and base: s['issues'].append(f'state: screen {base!r} -> {s["tid"]!r}')
            p = f'{tmp}/{name}-{key}-{lbl}.png'; pg.screenshot(path=p); row.append(p)
            s['step'] = lbl; rec['steps'].append(s)
        frames.append(row)
    except Exception as e:  # noqa: BLE001
        rec['steps'].append({'issues': ['ERROR ' + str(e)[:100]]})
    results.append(rec)
    ctx.close()


def main():
    sel = os.environ.get('SCREENS'); pairs = os.environ.get('PAIRS', ','.join(['320x568', '360x640', '375x667', '390x844', '430x932', '768x1024', '820x1180', '1280x800', '1920x1080'])).split(',')
    land = os.environ.get('LAND', '390x844,375x667').split(',')
    pack = os.environ.get('PACK', 'ti')
    names = [n for n in SCREENS if not sel or n in sel.split(',')]
    os.makedirs(OUT, exist_ok=True); tmp = OUT + '/frames'; os.makedirs(tmp, exist_ok=True)
    results = []
    with sync_playwright() as p:
        b = (p.chromium.launch(executable_path='/usr/bin/google-chrome') if BROWSER == 'chrome' else p.webkit.launch())
        for name in names:
            frames = []
            for pair in pairs:
                run_one(b, name, SCREENS[name], pair, False, pack, results, tmp, frames)
            for pair in land:
                if pair in PAIRS and PAIRS[pair][0] < PAIRS[pair][2] or True:
                    if pair in PAIRS: run_one(b, name, SCREENS[name], pair, True, pack, results, tmp, frames)
            bad = [r for r in results if r['screen'] == name and any(s.get('issues') for s in r['steps'])]
            print(f'{name}: {sum(1 for r in results if r["screen"] == name)} runs, {len(bad)} with issues', flush=True)
            if SHOTS and frames:
                os.makedirs(SHOT_DIR, exist_ok=True)
                sel_rows = [f for f in frames][:12]
                montage(sel_rows, f'{SHOT_DIR}/rot-{name}-montage.png', len(sel_rows))
        b.close()
    json.dump(results, open(f'{OUT}/rotate.json', 'w'), ensure_ascii=False, indent=1)
    # pass/fail table
    lines = ['| screen | runs | pass | fail | issue kinds (first example) |', '|---|---|---|---|---|']
    for name in names:
        rs = [r for r in results if r['screen'] == name]
        fails = [r for r in rs if any(s.get('issues') for s in r['steps'])]
        kinds = {}
        for r in fails:
            for s in r['steps']:
                for i in s.get('issues', []):
                    k = i.split(' ')[0].rstrip(':')
                    kinds.setdefault(k, f'{i[:70]} @{r["pair"]}/{s.get("step", "")}')
        lines.append(f'| {name} | {len(rs)} | {len(rs) - len(fails)} | {len(fails)} | ' + '; '.join(f'{k}: {v}' for k, v in kinds.items()) + ' |')
    open(f'{OUT}/rotate.md', 'w').write('\n'.join(lines) + '\n')
    print('\n'.join(lines))


if __name__ == '__main__':
    main()
