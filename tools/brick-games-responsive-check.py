#!/usr/bin/env python3
"""Responsive check for every brick-style game (Playwright, real Chrome).

For each game x viewport size it opens the game from the app, screenshots it and asserts:
  * nothing scrolls the page (sideways or down) and the game root fits the viewport,
  * every button / draggable piece / guide sign / progress pill is fully on screen and not
    clipped by an overflow-hidden ancestor,
  * no two of those overlap (guide vs slots, top bar vs stage, ...),
  * every tap target (button, piece) is at least 44px,
  * the game's key elements (slots, picture, tower, tray, ...) are on screen and not tiny.
Screenshots: <out>/resp-<game>-<w>x<h>.png.   Prints a pass/fail matrix.

  python3 tools/brick-games-responsive-check.py http://127.0.0.1:5210/ /tmp/shots
  ONLY=667x375,320x568  GAMES=wordbricks,tower   (optional filters)
"""
import os
import re
import sys
import json

from playwright.sync_api import sync_playwright

SIZES = [(320, 568), (360, 640), (375, 667), (390, 844), (430, 932), (667, 375), (844, 390),
         (768, 1024), (1024, 768), (1280, 800), (1920, 1080)]
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5210/'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/resp-shots'
MIN_TAP = 44

# name: (how to open, opener arg, root testid, key selectors that must be on screen, selectors ignored for overlap)
GAMES = {
    'wordbricks': ('bp', r'^Word Bricks\s*$', 'brick-words', ['[data-testid=slot]', '[data-testid=picture]', '[data-testid=piece]'], []),
    'tower': ('bp', r'^፯\s*$', 'stack-tower', ['[data-testid=level]', '[data-testid=baseplate]', '[data-testid=piece]'], []),
    'market': ('bp', r'^Word Market\s*$', 'word-market', ['[data-testid=market-list]', '[data-testid=stall]'], []),
    'train': ('bp', r'^Vowel Train\s*$', 'brick-train', ['[data-testid=train]', '[data-testid=cargo]'], []),
    'echo': ('bp', r'^Echo Match\s*$', 'brick-echo', ['[data-testid=echo-grid]'], []),
    'beats': ('bp', r'^Kebero Beats\s*$', 'brick-beats', ['[data-testid=beat-tray-area]', '[data-testid=drum]'], []),
    'catch': ('home', 'Letter Catch', 'brick-catch', ['[data-testid=catch-field]'], ['[data-testid=catch-brick]', '[data-testid=bin-brick]', '[data-testid=catch-lion]', '[data-testid=catch-basket]', '[data-testid=catch-bin]']),
    'steps': ('home', 'Learn ha, done', 'brick-learn', [], []),
    'hops': ('home', 'Learn ha, done', 'brick-learn', ['[data-testid=stone-river]'], []),
    'mix': ('home', 'Mix challenge, done', '[data-testid^=brick-]', [], []),
    'quiz': ('home', 'Quiz level 5, done', 'brick-quiz', ['[data-testid=quiz-options]'], []),
    'explorer': ('bp', r'^Explorer\s*$', None, [], []),
}

JS = r"""([keys, ignore, root, scrollOK]) => {
  const out = []
  const W = innerWidth, H = innerHeight
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e)
    if (!(r.width > 0 && r.height > 0) || cs.visibility === 'hidden' || cs.display === 'none') return false
    for (let p = e; p; p = p.parentElement) if (+getComputedStyle(p).opacity < 0.05) return false
    return true }
  const clipFrac = (e) => {
    const r = e.getBoundingClientRect(); let L = Math.max(0, r.left), T = Math.max(0, r.top), R = Math.min(W, r.right), B = Math.min(H, r.bottom)
    for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p)
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { const q = p.getBoundingClientRect()
        if (cs.overflowX !== 'visible') { L = Math.max(L, q.left); R = Math.min(R, q.right) }
        if (cs.overflowY !== 'visible') { T = Math.max(T, q.top); B = Math.min(B, q.bottom) } }
    }
    return Math.max(0, R - L) * Math.max(0, B - T) / (r.width * r.height) }
  const name = (e) => e.dataset.testid || e.getAttribute('aria-label') || (e.innerText || '').trim().slice(0, 14) || e.tagName
  const rootEl = root ? document.querySelector(root.startsWith('[') ? root : `[data-testid="${root}"]`) : document.body
  if (!rootEl) return ['root not found']
  if (document.documentElement.scrollWidth > W + 1) out.push('page scrolls sideways')
  if (!scrollOK && document.documentElement.scrollHeight > H + 1) out.push('page scrolls vertically')
  const rr = rootEl.getBoundingClientRect()
  if (root && (rr.bottom > H + 1 || rr.top < -1)) out.push(`root not inside viewport (${Math.round(rr.top)}..${Math.round(rr.bottom)} of ${H})`)
  const sel = 'button, [role=button], [data-testid=guide], [data-testid=progress], [data-testid=piece]'
  const ign = ignore.join(',')
  let atoms = [...rootEl.querySelectorAll(sel)].filter(vis)
  if (ign) atoms = atoms.filter((e) => !e.matches(ign) && !e.closest(ign))
  const keyEls = []
  for (const k of keys) for (const e of rootEl.querySelectorAll(k)) if (vis(e)) keyEls.push(e)
  if (keys.length && !keyEls.length) out.push('no key elements found')
  for (const e of [...new Set([...atoms, ...keyEls])]) {
    const r = e.getBoundingClientRect()
    if (!scrollOK || keyEls.includes(e)) {
      if (r.left < -0.5 || r.right > W + 0.5 || r.top < -0.5 || r.bottom > H + 0.5) out.push(`${name(e)} outside viewport`)
      else if (clipFrac(e) < 0.92) out.push(`${name(e)} clipped`)
    }
  }
  for (const e of keyEls) { const r = e.getBoundingClientRect(); if (Math.min(r.width, r.height) < 18) out.push(`${name(e)} too small ${Math.round(r.width)}x${Math.round(r.height)}`) }
  for (const e of atoms) { const r = e.getBoundingClientRect(); const isTap = e.matches('button, [role=button], [data-testid=piece]')
    if (isTap && (r.width < MIN_TAP - 0.5 || r.height < MIN_TAP - 0.5) && r.bottom > 0 && r.top < H) out.push(`tap ${name(e)} ${Math.round(r.width)}x${Math.round(r.height)}`) }
  // overlaps between unrelated atoms / key elements
  const all = [...new Set([...atoms, ...keyEls])]
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i], b = all[j]
    if (a.contains(b) || b.contains(a)) continue
    if ((name(a) === 'level' && name(b) === 'baseplate') || (name(b) === 'level' && name(a) === 'baseplate')) continue // the tower stands in the studs on purpose
    const x = a.getBoundingClientRect(), y = b.getBoundingClientRect()
    const w = Math.min(x.right, y.right) - Math.max(x.left, y.left), h = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top)
    if (w > 4 && h > 4) out.push(`overlap ${name(a)} / ${name(b)} (${Math.round(w)}x${Math.round(h)})`)
  }
  // a button whose centre is covered by something else
  for (const e of atoms.filter((a) => a.matches('button, [role=button]'))) {
    const r = e.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    if (cx < 0 || cy < 0 || cx > W || cy > H) continue
    const t = document.elementFromPoint(cx, cy)
    if (t && !e.contains(t) && !t.contains(e)) out.push(`${name(e)} covered by ${name(t)}`)
  }
  return [...new Set(out)]
}"""


def open_game(pg, how, arg):
    pg.goto(URL + ('&' if '?' in URL else '?') + 'unlock')
    pg.wait_for_timeout(2500)
    if how == 'bp':
        pg.get_by_role('button', name='Open backpack').click()
        pg.wait_for_timeout(600)
        t = pg.locator('[aria-modal=true] button').filter(has_text=re.compile(arg)).first
    else:
        t = pg.get_by_role('button', name=arg).first
    t.evaluate("e=>e.scrollIntoView({block:'center'})")
    pg.wait_for_timeout(250)
    t.click(force=True)
    pg.wait_for_timeout(1200)
    anyway = pg.get_by_role('button', name=re.compile('^Play anyway'))
    if anyway.count():
        anyway.first.click(force=True)
        pg.wait_for_timeout(1200)
    pg.wait_for_timeout(900)


def pop_all(pg):
    # Meet phase -> pop the seven bubbles to reach the stepping-stones phase.
    for _ in range(9):
        b = pg.get_by_role('button', name='Pop the bubble')
        if not b.count():
            break
        try:
            b.first.dispatch_event('pointerdown')
        except Exception:  # noqa: BLE001
            pass
        pg.wait_for_timeout(1700)
    pg.wait_for_timeout(1200)


POST = {'hops': pop_all}


def main():
    only = os.environ.get('ONLY'); gsel = os.environ.get('GAMES')
    sizes = [z for z in SIZES if not only or f'{z[0]}x{z[1]}' in only.split(',')]
    games = {k: v for k, v in GAMES.items() if not gsel or k in gsel.split(',')}
    os.makedirs(OUT, exist_ok=True)
    matrix = {}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
        for name, (how, arg, root, keys, ignore) in games.items():
            for (W, H) in sizes:
                mobile = W < 1000
                ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=mobile, has_touch=mobile, locale='en-US', device_scale_factor=1)
                ctx.add_init_script("(()=>{ if(!sessionStorage.getItem('__s')){ sessionStorage.setItem('__s','1'); localStorage.setItem('fq.pack','ti'); }})()")
                pg = ctx.new_page(); pg.on('dialog', lambda d: d.accept())
                try:
                    for _try in range(3):  # a node tap can miss while pulsing; re-open instead of failing
                        open_game(pg, how, arg)
                        if name in POST:
                            POST[name](pg)
                        pg.screenshot(path=f'{OUT}/resp-{name}-{W}x{H}.png')
                        fails = pg.evaluate("(a)=>(" + JS.replace('MIN_TAP', str(MIN_TAP)) + ")(a)", [keys, ignore, root, name == 'explorer'])
                        if fails != ['root not found']:
                            break
                except Exception as e:  # noqa: BLE001
                    fails = [f'ERROR {str(e)[:120]}']
                matrix[(name, f'{W}x{H}')] = fails
                print(('PASS' if not fails else 'FAIL'), name, f'{W}x{H}', '; '.join(fails[:6]), flush=True)
                ctx.close()
        b.close()
    json.dump({f'{k[0]}|{k[1]}': v for k, v in matrix.items()}, open(f'{OUT}/matrix.json', 'w'), indent=1)
    print('\n' + ' ' * 11 + ' '.join(f'{W}x{H}'[:7].rjust(7) for W, H in sizes))
    for name in games:
        print(name.ljust(11) + ' '.join(('  ok   ' if not matrix[(name, f"{W}x{H}")] else f' FAIL{len(matrix[(name, f"{W}x{H}")]):>2} ') for W, H in sizes))
    sys.exit(1 if any(matrix.values()) else 0)


if __name__ == '__main__':
    main()
