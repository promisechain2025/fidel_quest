#!/usr/bin/env python3
"""Screenshots of the My Progress screen at the review sizes, Amharic and Tigrinya.

  python3 tools/progress-shots.py http://127.0.0.1:5173/ /opt/cursor/artifacts/my-progress
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5173/'
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else '/opt/cursor/artifacts/my-progress')
OUT.mkdir(parents=True, exist_ok=True)
SIZES = [(375, 667), (414, 896), (768, 1024), (1024, 768), (1440, 900)]
PACKS = ['am', 'ti']
VIEWS = ['kid', 'grown']


def init_for(pack):
    return (
        "localStorage.clear();"
        "localStorage.setItem('fq.pack','%s');"
        "localStorage.setItem('fq.theme.v1','light');"
        "localStorage.setItem('fq.lang','en');"
        "sessionStorage.removeItem('egeez-seedprogress');"
    ) % pack


def expand(pg):
    pg.evaluate("""() => {
      const d = document.querySelector('[role=dialog]')
      if (d) { d.style.maxHeight = 'none'; d.style.height = 'auto'; d.style.overflow = 'visible' }
      const o = document.querySelector('[data-testid=app-progress-sheet]')
      if (o) { o.style.position = 'absolute'; o.style.inset = '0 auto auto 0'; o.style.height = 'auto'; o.style.width = '100%'; o.style.background = 'transparent' }
      document.documentElement.style.overflow = 'visible'
      document.body.style.overflow = 'visible'
    }""")


def main():
    fails = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for pack in PACKS:
            context = browser.new_context(viewport={'width': 1024, 'height': 768}, device_scale_factor=1)
            context.add_init_script(init_for(pack))
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            for view in VIEWS:
                page.goto(URL + f'?seedprogress=1&myprogress={view}', wait_until='networkidle')
                page.wait_for_selector('[data-testid=my-progress]', timeout=15000)
                count = page.locator('[data-testid=mp-row-count]').inner_text().split('\n')[0]
                mode = page.locator('[data-testid=my-progress]').get_attribute('data-mode')
                rows = page.locator('[data-testid=mp-rows] > div').count()
                print(f'{pack} {view}: rows={rows} count={count!r} mode={mode} errors={errors}')
                if mode != view:
                    fails.append(f'{pack} {view} opened as {mode}')
                if pack == 'ti' and rows != 34:
                    fails.append(f'ti row tiles {rows}')
                if pack == 'am' and rows != 33:
                    fails.append(f'am row tiles {rows}')
                for w, h in SIZES:
                    page.set_viewport_size({'width': w, 'height': h})
                    page.wait_for_timeout(200)
                    expand(page)
                    path = OUT / f'progress-{pack}-{view}-{w}x{h}.png'
                    page.locator('[data-testid=my-progress]').screenshot(path=str(path))
                    print(' wrote', path)
            context.close()
        browser.close()
    if fails:
        print('FAILED', fails)
        sys.exit(1)
    print('ALL OK', OUT)


if __name__ == '__main__':
    main()
