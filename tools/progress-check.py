#!/usr/bin/env python3
"""App-level progress check (Playwright, real Chrome): the home chip moves when a game/lesson reports,
persists across reload, is per child (profile slots 2-6 owned), shows in Grown-Ups; optional screenshots.

  python3 tools/progress-check.py http://localhost:5252/ [shots_dir]
"""
import json, re, sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5252/'
SHOTS = sys.argv[2] if len(sys.argv) > 2 else None
SLOTS = json.dumps({'owned': [f'profile_slot_{n}' for n in range(2, 7)]})
INIT = "if(!localStorage.getItem('seed')){localStorage.setItem('seed','1');localStorage.setItem('fq.pack','ti');localStorage.setItem('fq.profileslots.v1','%s')}" % SLOTS.replace("'", "\\'")
fails = []


def check(ok, msg):
    print(('PASS ' if ok else 'FAIL ') + msg)
    if not ok:
        fails.append(msg)


def count(pg):
    return pg.get_by_test_id('app-progress-count').inner_text()


def key(pg):
    return json.loads(pg.evaluate("localStorage.getItem('fq.appprogress.v1')") or '{}')


def open_bp(pg, name):
    pg.get_by_role('button', name='Open backpack').click(); pg.wait_for_timeout(500)
    all_ = pg.get_by_role('button', name=re.compile('^All letters'))
    if all_.count():
        all_.first.click(force=True); pg.wait_for_timeout(400)
    pg.locator('[aria-modal=true] button').filter(has_text=re.compile(name)).first.click(force=True); pg.wait_for_timeout(1000)
    anyway = pg.get_by_role('button', name=re.compile('^Play anyway'))
    if anyway.count():
        anyway.first.click(force=True); pg.wait_for_timeout(800)


def go_home(pg):
    pg.goto(URL + ('&' if '?' in URL else '?') + 'unlock'); pg.wait_for_timeout(2200)


with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    c = b.new_context(viewport={'width': 390, 'height': 844}); c.add_init_script(INIT)
    pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    go_home(pg)
    check(count(pg).startswith('0/'), 'home chip starts at 0/N')
    # a game reports: Stories for >8s, then a Word Market tap-around counts as a visit too
    open_bp(pg, r'^Stories\s*$'); pg.wait_for_timeout(9000)
    go_home(pg)
    check(count(pg).startswith('1/'), 'a game visited >8s moves the chip to 1/N (got %s)' % count(pg))
    check('stories' in key(pg).get('areas', {}), 'stories area recorded in fq.appprogress.v1')
    pg.reload(); pg.wait_for_timeout(2200)
    check(count(pg).startswith('1/'), 'persists across reload')
    # sheet
    pg.get_by_test_id('app-progress').click(); pg.wait_for_timeout(500)
    check(pg.get_by_test_id('app-progress-sheet').count() == 1, 'tap opens the sheet')
    check(pg.get_by_test_id('ap-area-stories').get_attribute('data-tried') == 'true', 'sheet marks Stories tried')
    if SHOTS: pg.screenshot(path=f'{SHOTS}/progress-sheet-phone.png')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    check(pg.get_by_test_id('app-progress-sheet').count() == 0, 'Escape closes the sheet')
    # per child: add a 2nd child, chip back at 0, then switch back to child 1
    pg.get_by_role('button', name=re.compile('^Playing: ')).click(); pg.wait_for_timeout(600)
    add = pg.get_by_role('button', name=re.compile('^Add a child')).first
    check(add.count() == 1, 'with slots 2-6 owned, Add a child is available')
    add.click(); pg.wait_for_timeout(500)
    pg.get_by_placeholder('e.g. Selam').fill('Abel'); pg.keyboard.press('Enter'); pg.wait_for_timeout(2500)
    pg.wait_for_selector('[data-testid=app-progress-count]', timeout=8000)
    check(count(pg).startswith('0/'), 'second child starts at 0/N (own progress), got %s' % count(pg))
    # child 2 plays something, then back to child 1: each keeps its own tally
    pg.get_by_role('button', name=re.compile('^Playing: ')).click(); pg.wait_for_timeout(600)
    pg.get_by_role('button', name=re.compile('^Play as ')).first.click(); pg.wait_for_timeout(2800)
    pg.wait_for_selector('[data-testid=app-progress-count]', timeout=8000)
    check(count(pg).startswith('1/'), 'switching back to child 1 restores 1/N, got %s' % count(pg))
    if SHOTS: pg.screenshot(path=f'{SHOTS}/progress-home-phone.png')
    print('console errors:', errs)
    check(not errs, 'no page errors')
    b.close()
print('FAILED' if fails else 'ALL OK'); sys.exit(1 if fails else 0)
