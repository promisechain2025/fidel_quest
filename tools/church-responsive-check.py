#!/usr/bin/env python3
"""Block Church responsive check (Playwright, real Chrome).

For every size below it opens the app, enters Block Church, and in BOTH the
family picker and mid-round (after 3 correct blocks) asserts that the church
scene, the big current block + its slot, and the 7 loose pieces are all fully
inside the viewport at the same time, that scene and tray do not overlap, that
every tap target is at least 44px, and that nothing scrolls the page sideways.
Screenshots go to <out>/church-<w>x<h>-<state>.png.

  python3 tools/church-responsive-check.py http://127.0.0.1:5173/ /tmp/shots
"""
import re
import os, sys

from playwright.sync_api import sync_playwright

SIZES = [(320, 568), (360, 640), (375, 667), (390, 844), (430, 932), (667, 375), (844, 390),
         (768, 1024), (1024, 768), (1280, 800), (1920, 1080)]

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5173/'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/church-shots'
MIN_TAP = 44
MIN_SCENE = 150  # px: the church must be at least this big in both directions


def rect(pg, tid):
    return pg.evaluate(
        "t=>{const e=document.querySelector(`[data-testid=\"${t}\"]`);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,r:r.right,b:r.bottom}}", tid)


def inside(r, W, H):
    return r and r['x'] >= -0.5 and r['y'] >= -0.5 and r['r'] <= W + 0.5 and r['b'] <= H + 0.5 and r['w'] > 0 and r['h'] > 0


def check(pg, W, H, state, fails):
    def bad(msg):
        fails.append(f'{W}x{H} {state}: {msg}')
    scene, panel = rect(pg, 'church-scene'), rect(pg, 'church-panel')
    if not inside(scene, W, H): bad(f'church scene not fully on screen {scene}')
    elif scene['w'] < MIN_SCENE or scene['h'] < MIN_SCENE: bad(f'church scene too small {scene["w"]:.0f}x{scene["h"]:.0f}')
    if not inside(panel, W, H): bad(f'tray not fully on screen {panel}')
    if scene and panel and not (scene['r'] <= panel['x'] + 0.5 or scene['b'] <= panel['y'] + 0.5 or panel['r'] <= scene['x'] + 0.5):
        bad('church scene overlaps the tray')
    if state != 'picker':
        for tid in ('big-block', 'slot', 'pieces'):
            if not inside(rect(pg, tid), W, H): bad(f'{tid} not fully on screen')
    sizes = pg.evaluate("""()=>[...document.querySelectorAll('[data-testid=block-church] button')].filter(b=>b.offsetParent).map(b=>{const r=b.getBoundingClientRect();
        const sc=b.closest('.bc-grid');let vis=true;if(sc){const g=sc.getBoundingClientRect();vis=r.bottom>g.top+4&&r.top<g.bottom-4}
        return {t:b.getAttribute('aria-label')||b.dataset.testid,w:r.width,h:r.height,x:r.x,y:r.y,r:r.right,b:r.bottom,vis}})""")
    for b in sizes:
        if not b['vis']: continue
        if b['w'] < MIN_TAP - 0.5 or b['h'] < MIN_TAP - 0.5: bad(f'tap target {b["t"]} is {b["w"]:.0f}x{b["h"]:.0f}')
        if b['x'] < -0.5 or b['r'] > W + 0.5: bad(f'button {b["t"]} outside viewport horizontally')
    if pg.evaluate("document.documentElement.scrollWidth > innerWidth + 1"): bad('page scrolls sideways')
    pcs = pg.evaluate("[...document.querySelectorAll('[data-testid=piece]')].length")
    if state != 'picker' and pcs != 7: bad(f'{pcs} pieces')
    # every built wall brick must be inside the church scene (not clipped)
    if scene:
        wb = pg.evaluate("[...document.querySelectorAll('[data-testid=wall-brick] rect')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,r:r.right,b:r.bottom}})")
        for r in wb:
            if r['x'] < scene['x'] or r['r'] > scene['r'] or r['b'] > scene['b'] - 2 or r['y'] < scene['y']:
                bad('a wall brick is clipped by the scene'); break
    guide = rect(pg, 'guide')
    if guide and scene and not (guide['b'] <= scene['y'] + 0.5 or guide['r'] <= scene['x'] + 0.5 or scene['r'] <= guide['x'] + 0.5):
        bad('guide sign overlaps the church')


def run():
    fails = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'])
        for (W, H) in [z for z in SIZES if not os.environ.get('ONLY') or f'{z[0]}x{z[1]}' in os.environ['ONLY'].split(',')]:
            mobile = W < 1000
            ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=mobile, has_touch=mobile, locale='en-US', device_scale_factor=1)
            ctx.add_init_script("(()=>{ if(!sessionStorage.getItem('__s')){ sessionStorage.setItem('__s','1'); localStorage.setItem('fq.pack','ti'); }})()")
            pg = ctx.new_page(); pg.on('dialog', lambda d: d.accept())
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            pg.goto(URL + ('&' if '?' in URL else '?') + 'unlock'); pg.wait_for_timeout(3500)
            pg.get_by_role('button', name='Open backpack').click(); pg.wait_for_timeout(700)
            tile = pg.locator('[aria-modal=true] button').filter(has_text=re.compile(r'^Block Church\s*$')).first
            tile.scroll_into_view_if_needed(); tile.click(); pg.wait_for_timeout(1800)
            pg.screenshot(path=f'{OUT}/church-{W}x{H}-1-picker.png'); check(pg, W, H, 'picker', fails)
            # pick the glowing (next) family
            pg.locator('[data-testid=family-tile][data-next="1"]').first.click(force=True); pg.wait_for_timeout(1200)
            pg.screenshot(path=f'{OUT}/church-{W}x{H}-2-start.png'); check(pg, W, H, 'start', fails)
            built = lambda: pg.evaluate("document.querySelectorAll('[data-testid=church-block]').length")
            def snap_until(n):
                for _ in range(40):
                    if built() >= n: return
                    for o in range(1, 8):
                        pc = pg.locator(f'[data-testid=piece][data-order="{o}"]')
                        if pc.count() and not pc.first.is_disabled():
                            pc.first.click(); pg.wait_for_timeout(120)
                            if built() >= n: break
                    pg.wait_for_timeout(500)
            snap_until(3); pg.wait_for_timeout(1500)
            pg.screenshot(path=f'{OUT}/church-{W}x{H}-3-placing.png'); check(pg, W, H, 'placing', fails)
            snap_until(7); pg.wait_for_timeout(2500)
            pg.screenshot(path=f'{OUT}/church-{W}x{H}-4-done.png'); check(pg, W, H, 'done', fails)
            if errs: fails.append(f'{W}x{H}: page errors {errs[:2]}')
            print(f'{W}x{H}', 'ok' if not [f for f in fails if f.startswith(f"{W}x{H}")] else 'FAIL', flush=True)
            ctx.close()
        b.close()
    for f in fails: print('FAIL', f)
    sys.exit(1 if fails else 0)


run()
