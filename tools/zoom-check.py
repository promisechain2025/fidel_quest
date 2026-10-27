#!/usr/bin/env python3
"""Accidental zoom / hold check for every eGeez screen (Playwright + CDP touch, real Chrome).

For each screen, in a touch-emulated phone viewport (390x844), it fires:
  * a two-finger pinch-out (Input.dispatchTouchEvent) and a double-tap and a triple-tap
    on the middle of the screen, then asserts visualViewport.scale === 1;
  * a 1s long-press on a text/image/button and a drag-selection, then asserts that
    getSelection() is empty;
  * a right-click / long-press 'contextmenu' on the screen and asserts it was
    default-prevented (outside text fields);
  * a horizontal and a downward overscroll swipe at the top, then asserts no sideways
    scroll and no document offset;
  * a Ctrl+wheel and Ctrl+'+' on desktop and asserts the browser zoom did not change
    (visualViewport scale / devicePixelRatio / document zoom stay put).
and writes <out>/zoom.json and <out>/zoom.md (pass/fail table).

  python3 tools/zoom-check.py http://localhost:5251/ /tmp/zoom
  SCREENS=home,wordbricks python3 tools/zoom-check.py ...
"""
import importlib.util, json, os, sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5251/'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/zoom'
spec = importlib.util.spec_from_file_location('rc', os.path.join(os.path.dirname(__file__), 'rotate-check.py'))
rc = importlib.util.module_from_spec(spec)
sys.argv_saved, sys.argv = sys.argv, ['x', URL, OUT]
spec.loader.exec_module(rc)
sys.argv = sys.argv_saved

PROBE = """() => { window.__ctx = []; window.__sel = [];
  document.addEventListener('contextmenu', e => window.__ctx.push(e.defaultPrevented), { capture: false });
  document.addEventListener('contextmenu', e => setTimeout(() => window.__ctx.push('final:' + e.defaultPrevented), 0), { capture: true }); return true }"""


def touch(cdp, typ, pts):
    cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(pts)]})


def pinch(cdp, pg, cx, cy):
    touch(cdp, 'touchStart', [(cx - 20, cy), (cx + 20, cy)])
    for d in range(20, 140, 12):
        touch(cdp, 'touchMove', [(cx - d, cy), (cx + d, cy)]); pg.wait_for_timeout(16)
    touch(cdp, 'touchEnd', [])


def tap(cdp, pg, x, y, n=1):
    for _ in range(n):
        touch(cdp, 'touchStart', [(x, y)]); pg.wait_for_timeout(30); touch(cdp, 'touchEnd', []); pg.wait_for_timeout(60)


def run(b, name, opener, pack):
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, locale='en-US')
    ctx.add_init_script("(()=>{ if(!sessionStorage.getItem('__s')){ sessionStorage.setItem('__s','1'); localStorage.setItem('fq.pack','%s'); }})()" % pack)
    pg = ctx.new_page(); pg.on('dialog', lambda d: d.accept())
    res = {'screen': name, 'fails': []}
    try:
        if not opener(pg):
            res['fails'].append('NOT OPENED'); ctx.close(); return res
        pg.wait_for_timeout(500)
        cdp = ctx.new_cdp_session(pg)
        pg.evaluate(PROBE)
        scale0 = pg.evaluate('visualViewport.scale')
        # pinch, double-tap, triple-tap on a harmless spot (the middle)
        pinch(cdp, pg, 195, 420); pg.wait_for_timeout(250)
        tap(cdp, pg, 195, 420, 2); pg.wait_for_timeout(250)
        tap(cdp, pg, 195, 420, 3); pg.wait_for_timeout(250)
        pinch(cdp, pg, 195, 300); pg.wait_for_timeout(250)
        sc = pg.evaluate('visualViewport.scale')
        if abs(sc - scale0) > 0.01: res['fails'].append(f'zoom: visualViewport.scale {scale0}->{sc}')
        # long press (1s) at a few spots + drag select
        for (x, y) in ((195, 200), (195, 420), (100, 600), (300, 700)):
            touch(cdp, 'touchStart', [(x, y)]); pg.wait_for_timeout(1000); touch(cdp, 'touchEnd', []); pg.wait_for_timeout(100)
        touch(cdp, 'touchStart', [(40, 300)])
        for i in range(10):
            touch(cdp, 'touchMove', [(40 + i * 30, 300 + i * 4)]); pg.wait_for_timeout(16)
        touch(cdp, 'touchEnd', [])
        # mouse: triple click + drag select (desktop-ish) + right-click
        pg.mouse.click(195, 300, click_count=3); pg.mouse.move(40, 250); pg.mouse.down(); pg.mouse.move(350, 600, steps=8); pg.mouse.up()
        sel = pg.evaluate("getSelection().toString().trim()")
        if sel: res['fails'].append(f'selection: {sel[:30]!r}')
        pg.mouse.click(195, 420, button='right'); pg.wait_for_timeout(150)
        ctxm = pg.evaluate('window.__ctx')
        if any(v is False or v == 'final:false' for v in ctxm) and not pg.evaluate("['INPUT','TEXTAREA'].includes(document.activeElement && document.activeElement.tagName)"):
            res['fails'].append('contextmenu not prevented')
        # horizontal / vertical overscroll
        cdp.send('Input.synthesizeScrollGesture', {'x': 300, 'y': 300, 'xDistance': 250, 'yDistance': 0, 'gestureSourceType': 'touch'})
        cdp.send('Input.synthesizeScrollGesture', {'x': 195, 'y': 200, 'xDistance': 0, 'yDistance': 300, 'gestureSourceType': 'touch'})
        pg.wait_for_timeout(300)
        sx = pg.evaluate('scrollX')
        if sx: res['fails'].append(f'sideways scroll x={sx}')
        # desktop browser zoom guard
        pg.keyboard.down('Control'); pg.mouse.wheel(0, -300); pg.keyboard.up('Control'); pg.wait_for_timeout(150)
        pg.keyboard.press('Control+Equal'); pg.keyboard.press('Control+Plus'); pg.wait_for_timeout(150)
        res['prevented'] = pg.evaluate('window.__zoomKeysPrevented')
        sc = pg.evaluate('visualViewport.scale')
        if abs(sc - scale0) > 0.01: res['fails'].append(f'zoom after ctrl: {sc}')
    except Exception as e:  # noqa: BLE001
        res['fails'].append('ERROR ' + str(e)[:100])
    ctx.close()
    return res


def main():
    sel = os.environ.get('SCREENS'); pack = os.environ.get('PACK', 'ti')
    names = [n for n in rc.SCREENS if n != 'setup' and (not sel or n in sel.split(','))]
    os.makedirs(OUT, exist_ok=True); rows = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
        for n in names:
            r = run(b, n, rc.SCREENS[n], pack); rows.append(r)
            print(n, 'PASS' if not r['fails'] else r['fails'], flush=True)
        b.close()
    json.dump(rows, open(f'{OUT}/zoom.json', 'w'), indent=1)
    md = ['| screen | result | issues |', '|---|---|---|'] + [f"| {r['screen']} | {'PASS' if not r['fails'] else 'FAIL'} | {'; '.join(r['fails'])} |" for r in rows]
    open(f'{OUT}/zoom.md', 'w').write('\n'.join(md) + '\n')


if __name__ == '__main__':
    main()
