#!/usr/bin/env python3
"""Progress share-link e2e (Playwright, real Chrome).

Child 1 plays (a game + the ጸሎት book), the parent generates the Progress Card link in Grown-ups, then the link is opened
on the website in FRESH browser contexts at other sizes (tablet, desktop, phone landscape, 320px) and reloaded. A second child
proves the link is per child. Also asserts: no Latin beside fidel, no title tooltips, no horizontal overflow, the fragment is
never requested, no private data in the token.

  python3 tools/share-check.py http://localhost:5252/ http://127.0.0.1:5253 [shots_dir]
"""
import importlib.util, json, os, re, sys
from playwright.sync_api import sync_playwright

APP = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5252/'
SITE = (sys.argv[2] if len(sys.argv) > 2 else 'http://127.0.0.1:5253').rstrip('/')
SHOTS = sys.argv[3] if len(sys.argv) > 3 else None
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('pc', os.path.join(here, 'rotate-check.py'))
rc = importlib.util.module_from_spec(spec); sys.argv_backup = sys.argv; spec.loader.exec_module(rc)

SLOTS = json.dumps({'owned': [f'profile_slot_{n}' for n in range(2, 7)]})
INIT = "if(!localStorage.getItem('seed')){localStorage.setItem('seed','1');localStorage.setItem('fq.pack','ti');localStorage.setItem('fq.profileslots.v1','%s')}" % SLOTS.replace("'", "\\'")
fails = []


def check(ok, msg):
    print(('PASS ' if ok else 'FAIL ') + msg)
    if not ok: fails.append(msg)


def home(pg):
    pg.goto(APP + ('&' if '?' in APP else '?') + 'unlock'); pg.wait_for_timeout(2200)


def open_bp(pg, name):
    pg.get_by_role('button', name='Open backpack').click(); pg.wait_for_timeout(500)
    all_ = pg.get_by_role('button', name=re.compile('^All letters'))
    if all_.count():
        all_.first.click(force=True); pg.wait_for_timeout(400)
    pg.locator('[aria-modal=true] button').filter(has_text=re.compile(name)).first.click(force=True); pg.wait_for_timeout(1200)
    anyway = pg.get_by_role('button', name=re.compile('^Play anyway'))
    if anyway.count():
        anyway.first.click(force=True); pg.wait_for_timeout(800)


def share_link(pg):
    """Grown-ups -> Share progress report -> the link the parent would send (clipboard)."""
    home(pg)
    assert rc.open_grownups(pg), 'parent gate did not open'
    pg.get_by_role('button', name=re.compile('Share progress report')).click(); pg.wait_for_timeout(600)
    url = pg.evaluate('navigator.clipboard.readText()')
    return url


def token(url):
    return re.search(r'#p=(.+)$', url).group(1)


def decode_token(tok):
    import base64
    t = tok.replace('-', '+').replace('_', '/'); t += '=' * (-len(t) % 4)
    return json.loads(base64.b64decode(t).decode('utf-8'))


def view(b, url, w, h, label, shot=None, touch=False):
    """Open the link in a FRESH context (no app storage), check it, reload, check again."""
    c = b.new_context(viewport={'width': w, 'height': h}, has_touch=touch)
    pg = c.new_page(); errs = []; reqs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('request', lambda r: reqs.append(r.url))
    pg.goto(url)
    try:
        pg.wait_for_selector('[data-testid=prp-app-level]', timeout=15000)
    except Exception:
        print('DEBUG', label, url[:140], pg.inner_text('body')[:200].replace('\n', ' | ')); raise
    pg.wait_for_timeout(900)
    read = lambda: {
        'tried': pg.get_by_test_id('prp-app-tried').inner_text(),
        'min': pg.get_by_test_id('prp-prayer-min').inner_text(),
        'pages': pg.get_by_test_id('prp-prayer-pages').inner_text(),
        'prayer': pg.get_by_test_id('prp-prayer').inner_text(),
        'h2': pg.locator('h2').first.inner_text(),
    }
    first = read()
    over = pg.evaluate('document.documentElement.scrollWidth - innerWidth')
    check(over <= 1, f'{label}: no horizontal overflow ({over}px)')
    check(not any('#p=' in r or token(url)[:20] in r for r in reqs), f'{label}: token fragment never sent in any request')
    check(pg.locator('[title]').count() == 0 or all(not re.search(r'[A-Za-z]', t or '') for t in pg.eval_on_selector_all('.lt[title]', 'els=>els.map(e=>e.title)')), f'{label}: no Latin title tooltips on fidel tiles')
    check(pg.locator('.lt.geez').count() in (33, 34), f'{label}: 33/34 fidel family tiles (Tigrinya adds ቐ)')
    if shot and SHOTS: pg.screenshot(path=shot, full_page=True)
    pg.reload(); pg.wait_for_selector('[data-testid=prp-app-level]', timeout=15000); pg.wait_for_timeout(500)
    check(read() == first, f'{label}: identical after reload')
    check(not errs, f'{label}: no page errors {errs}')
    c.close()
    return first


with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    c = b.new_context(viewport={'width': 390, 'height': 844}, permissions=['clipboard-read', 'clipboard-write'])
    c.add_init_script(INIT)
    pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))

    # ---- child 1 plays: a game (visit >8s) + the ጸሎት book (turn a page) ----
    home(pg)
    open_bp(pg, r'^Stories\s*$'); pg.wait_for_timeout(9000)
    home(pg)
    open_bp(pg, 'ጸሎት'); pg.wait_for_timeout(9000)
    nxt = pg.get_by_test_id('page-next')
    check(nxt.count() == 1, 'ጸሎት book opened from the backpack')
    for _ in range(2):
        nxt.click(); pg.wait_for_timeout(1500)
    ap = json.loads(pg.evaluate("localStorage.getItem('fq.appprogress.v1')") or '{}')
    check(ap.get('areas', {}).get('prayer', {}).get('done', 0) == 2, 'exactly 2 page turns recorded (opening is not a turn) on the prayer area: %s' % ap.get('areas', {}).get('prayer'))
    check(ap.get('areas', {}).get('stories', {}).get('visits', 0) >= 1, 'stories visit recorded')

    url1 = share_link(pg)
    check(url1.startswith('https://easygeez.com/progress#p='), 'link is the website /progress page with a fragment-only token')
    raw = decode_token(token(url1))
    check(set(raw) == {'v', 'n', 'd', 's', 'L', 'm', 'c', 'T', 'a', 'r'}, 'token carries only counts/masks + first name: %s' % sorted(raw))
    check(len(raw['a']) == 30 and raw['a'].count('1') >= 2, 'app mask has stories + prayer tried (%s)' % raw['a'])
    local1 = url1.replace('https://easygeez.com', SITE)

    # ---- a second child with different progress ----
    pg.keyboard.press('Escape')
    home(pg)
    pg.get_by_role('button', name=re.compile('^Playing: ')).click(); pg.wait_for_timeout(600)
    pg.get_by_role('button', name=re.compile('^Add a child')).first.click(); pg.wait_for_timeout(500)
    pg.get_by_placeholder('e.g. Selam').fill('Abel'); pg.keyboard.press('Enter'); pg.wait_for_timeout(2800)
    url2 = share_link(pg)
    raw2 = decode_token(token(url2))
    check(raw2['n'] == 'Abel' and raw2['a'].count('1') == 0 and raw2['r'] == [0, 0], 'child 2 link is its own: %s r=%s' % (raw2['a'].count('1'), raw2['r']))
    local2 = url2.replace('https://easygeez.com', SITE)

    # ---- open the links in fresh contexts at other sizes, reload each ----
    r1 = view(b, local1, 820, 1180, 'tablet', f'{SHOTS}/share-tablet.png' if SHOTS else None, touch=True)
    check(int(re.sub(r'\D','',r1['tried']) or 0) >= 2, f"tablet shows >=2 places explored ({r1['tried']})")
    check(int(re.sub(r'\D','',r1['pages']) or 0) >= 1, f"tablet shows ጸሎት pages ({r1['pages']})")
    check(r1['prayer'].startswith('ጸሎት') and not re.search(r'[A-Za-z]', r1['prayer'].split('ጸሎት')[0]), 'ጸሎት label has no Latin before it')
    check(raw['n'] == '' and 'Abel' not in r1['h2'], f"unnamed child 1: no fake name in token, heading '{r1['h2']}'")
    r1d = view(b, local1, 1440, 900, 'desktop', f'{SHOTS}/share-desktop.png' if SHOTS else None)
    r1p = view(b, local1, 390, 844, 'phone', f'{SHOTS}/share-phone.png' if SHOTS else None, touch=True)
    view(b, local1, 844, 390, 'phone-landscape', None, touch=True)
    view(b, local1, 320, 568, 'tiny-320', None, touch=True)
    check(r1 == r1d == r1p or (r1['tried'], r1['min'], r1['pages']) == (r1d['tried'], r1d['min'], r1d['pages']) == (r1p['tried'], r1p['min'], r1p['pages']), 'same numbers at every size')
    r2 = view(b, local2, 820, 1180, 'child2-tablet')
    check(r2['tried'] == '0' and r2['pages'].startswith('0') and 'Abel' in r2['h2'], f'child 2 shows its own zeros: {r2}')
    check(r2['tried'] != r1['tried'], 'child 1 and child 2 differ')

    # an OLD v1 card (no app fields) still renders, without the app block
    import base64
    old = base64.urlsafe_b64encode(json.dumps({'v': 1, 'n': 'Old', 'd': '2026-07-01', 's': 2, 'L': 14, 'm': '11' + '0' * 31, 'c': 2, 'T': 20}).encode()).decode().rstrip('=')
    c2 = b.new_context(viewport={'width': 390, 'height': 844}); q = c2.new_page(); q.goto(f'{SITE}/progress#p={old}'); q.wait_for_timeout(1500)
    check(q.locator('h2', has_text='Old').count() == 1 and q.get_by_test_id('prp-app-level').count() == 0, 'old card renders without the app block')
    q.goto(f'{SITE}/progress#p=garbage'); q.wait_for_timeout(1000)
    check(q.get_by_text('No report in this link').count() == 1, 'garbage token shows the friendly empty state')
    c2.close()
    check(not errs, f'app: no page errors {errs}')
    b.close()
print('FAILED' if fails else 'ALL OK'); sys.exit(1 if fails else 0)
