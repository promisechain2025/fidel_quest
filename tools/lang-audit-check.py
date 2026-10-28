#!/usr/bin/env python3
"""Language audit (Playwright, real Chrome): open every game/screen under Amharic and Tigrinya,
collect the Ge'ez words on screen, the word-audio files requested and the pictures shown,
and flag anything that belongs to the other language.

  python3 tools/lang-audit-check.py http://localhost:5241/ /tmp/lang-audit [shots]
  GAMES=wordbricks,echo  PACKS=ti   (optional filters); pass `shots` to save lang-<game>-<pack>-<w>x<h>.png
"""
import json, os, re, sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5241/'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/lang-audit'
SHOTS = len(sys.argv) > 3 and sys.argv[3] == 'shots'
SIZES = [(390, 844), (1280, 800)]

# name: (how, arg)  bp = backpack tile, home = home-screen button
GAMES = {
    'wordbricks': ('bp', r'^Word Bricks\s*$'), 'tower': ('bp', r'^፯\s*$'), 'church': ('bp', r'^Block Church\s*$'),
    'echo': ('bp', r'^Echo Match\s*$'), 'beats': ('bp', r'^Kebero Beats\s*$'), 'train': ('bp', r'^Vowel Train\s*$'),
    'market': ('bp', r'^Word Market\s*$'), 'build': ('bp', r'^(Word Workshop|Build)\s*$'), 'bingo': ('bp', r'^Bingo\s*$'),
    'traffic': ('bp', r'^Traffic\s*$'), 'firstwords': ('bp', r'^First Words\s*$'), 'stories': ('bp', r'^Stories\s*$'),
    'prayer': ('bp', r'^ጸሎት\s*$'), 'explorer': ('bp', r'^Explorer\s*$'), 'myname': ('bp', r'^My Name\s*$'),
    'postcard': ('bp', r'^Postcard\s*$'), 'closet': ('bp', r'^Closet\s*$'), 'teacher': ('bp', r'^Teacher\s*$'),
    'review': ('bp', r'^Review\s*$'),
    'catch': ('home', 'Letter Catch'), 'hunt': ('home', 'Daily Hunt'), 'wordbuild': ('home', 'Word Build, done'),
    'find': ('home', 'Find the letter, done'), 'schoolpath': ('home', 'School Path · Unit 1, done'),
    'learn': ('home', 'Learn ha, done'), 'mix': ('home', 'Mix challenge, done'), 'quiz': ('home', 'Quiz level 5, done'),
    'runner': ('home', 'Letter Runner'), 'checkin': ('home', 'Letter check-in'),
}
GEEZ = re.compile(r'[ሀ-ቈቊ-ዐዒ-ፚ]+')


def open_game(pg, how, arg):
    pg.goto(URL + ('&' if '?' in URL else '?') + 'unlock'); pg.wait_for_timeout(2500)
    if how == 'bp':
        pg.get_by_role('button', name='Open backpack').click(); pg.wait_for_timeout(500)
        all_ = pg.get_by_role('button', name=re.compile('^All letters'))
        if all_.count():
            all_.first.click(force=True); pg.wait_for_timeout(500)
        t = pg.locator('[aria-modal=true] button').filter(has_text=re.compile(arg)).first
    else:
        t = pg.get_by_role('button', name=arg).first
    if not t.count():
        return False
    t.evaluate("e=>e.scrollIntoView({block:'center'})"); pg.wait_for_timeout(250)
    t.click(force=True); pg.wait_for_timeout(1200)
    anyway = pg.get_by_role('button', name=re.compile('^Play anyway'))
    if anyway.count():
        anyway.first.click(force=True); pg.wait_for_timeout(1200)
    pg.wait_for_timeout(1200)
    return True


def main():
    gsel = os.environ.get('GAMES'); psel = os.environ.get('PACKS', 'am,ti').split(',')
    games = {k: v for k, v in GAMES.items() if not gsel or k in gsel.split(',')}
    os.makedirs(OUT, exist_ok=True)
    res = {}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
        for name, (how, arg) in games.items():
            for pack in psel:
                for (W, H) in (SIZES if SHOTS else SIZES[:1]):
                    ctx = b.new_context(viewport={'width': W, 'height': H}, is_mobile=W < 1000, has_touch=W < 1000, locale='en-US')
                    ctx.add_init_script("(()=>{ if(!sessionStorage.getItem('__s')){ sessionStorage.setItem('__s','1'); localStorage.setItem('fq.pack','%s'); }})()" % pack)
                    pg = ctx.new_page(); pg.on('dialog', lambda d: d.accept())
                    reqs = []
                    pg.on('request', lambda r: reqs.append(r.url) if '/audio/fidel/words/' in r.url else None)
                    try:
                        ok = open_game(pg, how, arg)
                        data = pg.evaluate("""() => { const root = document.querySelector('[aria-modal=true]') || document.body
                          const txt = (root.innerText || '') + ' ' + [...root.querySelectorAll('[aria-label],[alt]')].map(e => (e.getAttribute('aria-label')||'') + ' ' + (e.getAttribute('alt')||'')).join(' ')
                          const pics = [...root.querySelectorAll('img')].map(i => i.getAttribute('src')).filter(Boolean)
                          return { txt, pics } }""") if ok else {'txt': '', 'pics': []}
                        if SHOTS:
                            pg.screenshot(path=f'/workspace/egeez-brick-samples/shots/lang-{name}-{pack}-{W}x{H}.png')
                    except Exception as e:  # noqa: BLE001
                        data = {'txt': '', 'pics': [], 'err': str(e)[:100]}; ok = False
                    words = sorted(set(GEEZ.findall(data['txt'])))
                    auds = sorted(set(re.sub(r'.*/words/|\.mp3.*', '', u) for u in reqs))
                    res[f'{name}|{pack}|{W}x{H}'] = {'opened': ok, 'geez': words, 'audio': auds, 'pics': sorted(set(data['pics']))[:40], 'err': data.get('err')}
                    print(name, pack, f'{W}x{H}', 'opened' if ok else 'NOT OPENED', len(words), 'geez', len(auds), 'audio', flush=True)
                    ctx.close()
        b.close()
    json.dump(res, open(f'{OUT}/audit.json', 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
