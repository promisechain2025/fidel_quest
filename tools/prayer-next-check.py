#!/usr/bin/env python3
"""Prayer book: Next on the last page of a day. Usage: prayer-next-check.py URL TAG [book=wudase-monday]
Saves /workspace/egeez-brick-samples/shots/prayer-next-<TAG>-<w>x<h>.png (last page of the day, then after tapping Next)."""
import sys, re, json
from playwright.sync_api import sync_playwright
URL, TAG = sys.argv[1], sys.argv[2]
BOOK = sys.argv[3] if len(sys.argv) > 3 else 'wudase-monday'
SIZES = [(360, 640), (390, 844), (667, 375), (768, 1024), (1280, 800)]
OUT = '/workspace/egeez-brick-samples/shots'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
    for W, H in SIZES:
        mobile = W < 1000
        ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=mobile, has_touch=mobile, locale='en-US')
        init = "(()=>{ if(!sessionStorage.getItem('__s')){ sessionStorage.setItem('__s','1'); localStorage.setItem('fq.pack','ti'); localStorage.setItem('fq.prayer.book','%s'); }})()" % BOOK
        ctx.add_init_script(init)
        pg = ctx.new_page(); pg.on('dialog', lambda d: d.accept())
        pg.goto(URL + ('&' if '?' in URL else '?') + 'unlock'); pg.wait_for_timeout(2500)
        pg.get_by_role('button', name='Open backpack').click(); pg.wait_for_timeout(600)
        pg.locator('[aria-modal=true] button').filter(has_text=re.compile('^ጸሎት')).first.click(force=True)
        pg.wait_for_timeout(2500)
        # turn pages to the last page of the day (Next is hidden when disabled, or carries data-next-book on the last page)
        for _ in range(60):
            n = pg.get_by_test_id('page-next')
            if not n.is_visible() or n.get_attribute('data-next-book'): break
            n.click(force=True); pg.wait_for_timeout(800)
        pg.wait_for_timeout(500)
        title = lambda: pg.get_by_test_id('book-picker').get_attribute('aria-label')
        nxt = pg.get_by_test_id('page-next')
        vis = nxt.is_visible() and nxt.is_enabled()
        t0 = title()
        pg.screenshot(path=f'{OUT}/prayer-next-{TAG}-{W}x{H}-1-last-page.png')
        moved = None
        if vis:
            nxt.click(force=True); pg.wait_for_timeout(1500)
            moved = title()
            pg.screenshot(path=f'{OUT}/prayer-next-{TAG}-{W}x{H}-2-after-next.png')
        else:
            pg.screenshot(path=f'{OUT}/prayer-next-{TAG}-{W}x{H}-2-after-next.png')
        print(f'{W}x{H}: next visible={vis} locked={nxt.get_attribute("data-locked") if vis else None} before="{t0}" after="{moved}"', flush=True)
        ctx.close()
    b.close()
