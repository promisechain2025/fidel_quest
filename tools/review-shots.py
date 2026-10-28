#!/usr/bin/env python3
"""Review screenshots of a build: home bar, progress sheet (incl. the prayer tracker), the share-link view,
and a "latest updates" card.  python3 tools/review-shots.py APP_URL SITE_URL OUT_DIR"""
import json, re, sys, importlib.util
from datetime import date
from playwright.sync_api import sync_playwright
APP, SITE, OUT = sys.argv[1], sys.argv[2].rstrip('/'), sys.argv[3]
sys.argv = ['x', APP, '/tmp/pa/zz']
spec = importlib.util.spec_from_file_location('rc', '/workspace/fq-progress/tools/rotate-check.py'); rc = importlib.util.module_from_spec(spec); spec.loader.exec_module(rc)
t = date.today().isoformat()
A = {'stone': (5, 12, 10, 3), 'lesson': (2, 20, 16, 2), 'stories': (1, 0, 0, 1), 'echo': (1, 18, 14, 2), 'train': (1, 9, 7, 1), 'prayer': (2, 0, 0, 6), 'blocks': (1, 0, 0, 2), 'market': (1, 6, 5, 0), 'hunt': (1, 5, 5, 1), 'bingo': (1, 4, 3, 0), 'explore': (1, 0, 0, 0)}
areas = {k: {'visits': v[0], 'answers': v[1], 'correct': v[2], 'done': v[3], 'last': t} for k, v in A.items()}
data = {'v': 1, 'areas': areas, 'days': {t: {'answers': 74, 'correct': 60, 'done': 14, 'areas': list(A)}}}
practice = {'v': 1, 'days': {t: {'day': t, 'activeMs': 25 * 60000, 'prayerMs': 14 * 60000, 'sessions': 3, 'items': 20, 'answered': 20, 'correct': 16}}, 'goal': 10}
slots = {'owned': [f'profile_slot_{n}' for n in range(2, 7)]}
INIT = ("if(!localStorage.getItem('seed')){localStorage.setItem('seed','1');localStorage.setItem('fq.pack','ti');"
        "localStorage.setItem('fq.appprogress.v1',%s);localStorage.setItem('fq.practice.v1',%s);localStorage.setItem('fq.profileslots.v1',%s)}"
        % (json.dumps(json.dumps(data)), json.dumps(json.dumps(practice)), json.dumps(json.dumps(slots))))
NEW = [('#101', 'App-level progress', 'A home progress bar, a progress sheet with the ጸሎት tracker, and a private progress card parents can share'),
       ('#100', 'Rotation and zoom', 'Every screen turns, resizes and zooms without losing the place; holds are safe'),
       ('#99', 'Word Bricks', 'Words follow the language the child picked'),
       ('#98', 'Prayer book', 'Next carries on from one day to the next')]
def card_html():
    li = ''.join(f'<li><b>{n}</b> <span>{a}</span><p>{b}</p></li>' for n, a, b in NEW)
    return f'<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><body style="margin:0;font-family:system-ui;background:#fdf6e3;color:#3b2a14"><div style="max-width:720px;margin:0 auto;padding:20px"><h1 style="font-size:24px">eGeez 1.4.2: latest updates</h1><ul style="list-style:none;padding:0;display:grid;gap:12px">{li}</ul></div><style>li{{background:#fff;border-radius:16px;padding:12px 16px;box-shadow:0 2px 6px #0002}}li span{{font-weight:800;margin-left:6px}}li p{{margin:6px 0 0}}</style>'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--unsafely-treat-insecure-origin-as-secure=http://localhost:5252'])
    for tag, (w, h) in {'phone': (390, 844), 'tablet': (820, 1180), 'desktop': (1366, 800)}.items():
        c = b.new_context(viewport={'width': w, 'height': h}, is_mobile=tag != 'desktop', has_touch=tag != 'desktop', locale='en-US', permissions=['clipboard-read', 'clipboard-write'])
        c.add_init_script(INIT)
        pg = c.new_page(); pg.goto(APP + ('&' if '?' in APP else '?') + 'unlock'); pg.wait_for_timeout(2800)
        pg.screenshot(path=f'{OUT}/review-home-{tag}.png')
        pg.get_by_test_id('app-progress').click(); pg.wait_for_timeout(900)
        pg.screenshot(path=f'{OUT}/review-sheet-{tag}.png')
        pr = pg.get_by_test_id('ap-prayer')
        if pr.count():
            pr.scroll_into_view_if_needed(); pg.wait_for_timeout(500)
            pg.screenshot(path=f'{OUT}/review-sheet-prayer-{tag}.png')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
        assert rc.open_grownups(pg); pg.wait_for_timeout(800)
        pg.get_by_role('button', name=re.compile('Share progress report')).click(); pg.wait_for_timeout(600)
        url = pg.evaluate('navigator.clipboard.readText()'); print(tag, url[:60], len(url))
        sp = c.new_page(); sp.goto(url.replace('https://easygeez.com', SITE)); sp.wait_for_timeout(2500)
        sp.screenshot(path=f'{OUT}/review-share-{tag}.png', full_page=True)
        sp.set_content(card_html()); sp.wait_for_timeout(300); sp.screenshot(path=f'{OUT}/review-updates-{tag}.png')
        c.close()
    b.close()
