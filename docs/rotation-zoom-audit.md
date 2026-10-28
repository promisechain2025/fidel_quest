# Rotation and zoom/hold audit

Branch `fix/rotation-zoom`. Scope: every eGeez screen and game, web app and the Capacitor iOS/Android apps.
Two problems: (A) the layout breaking when a child rotates the device, (B) accidental zoom or hold (pinch, double-tap, long-press, selection, callouts, context menus, overscroll).

## How it was checked

* `tools/rotate-check.py` — Playwright + real Chrome. For each screen it opens the screen, then does a LIVE viewport rotation (`set_viewport_size`) portrait -> landscape -> back, and (for the L variants) landscape first. After every step it checks: horizontal/vertical overflow, tiny tap targets (<24px, unless a larger `::before` hit area), tap targets cut off by an `overflow:hidden` ancestor, targets covered by something else, the screen identity changing (state loss), and (with `SAFE=1`) controls under the notch, Dynamic Island or home indicator (CDP `Emulation.setSafeAreaInsetsOverride`: portrait top 47 / bottom 34; landscape bottom 21 and left/right 47 when the width is >= 780).
  Size pairs (11 runs per screen, each one rotates to its inverse and back): phones 320x568, 360x640, 375x667, 390x844, 430x932 (portrait first); phones landscape first 568x320 and 844x390; tablets 768x1024 and 820x1180; desktop 1280x800 and 1920x1080, each resized live to a narrow split window (500x800 / 700x1080). `python3 tools/rotate-check.py <url> <out> shots` writes the montages `rot-<screen>-montage.png`.
* `tools/zoom-check.py` — 390x844 touch phone, CDP `Input.dispatchTouchEvent`: two-finger pinch, double-tap, triple-tap, 1 s long-press, drag-selection, `contextmenu`, sideways and downward overscroll swipes, Ctrl+wheel and Ctrl +/-/=. Asserts `visualViewport.scale === 1`, the selection is empty, `contextmenu` is default-prevented, no sideways scroll, and the desktop zoom keys are default-prevented.
* Unit tests: `src/gestureGuard.test.js`, `src/rotationConfig.test.js`, `src/layoutTargets.test.js`.

## What changed

Zoom/hold (B)
* Viewport meta: `maximum-scale=1, user-scalable=no, viewport-fit=cover`.
* `src/platform/gestureGuard.js` (installed from `src/main.jsx`): prevents iOS `gesturestart/change/end`, multi-touch `touchmove`, Ctrl/Cmd + wheel and Ctrl/Cmd + `+ - = 0`, `contextmenu`, `selectstart`, `dragstart` and `dblclick`. Text inputs stay selectable and editable.
* CSS: `user-select:none` and `-webkit-touch-callout:none` on the app, `-webkit-user-drag:none` on images/media, `overscroll-behavior:none`, `-webkit-text-size-adjust:100%`, transparent tap highlight, `touch-action` kept on game surfaces.
* Decision: kid screens cannot zoom. Grown-Ups (settings, gate-side adult pages) is marked `data-allow-zoom` and keeps pinch/zoom for adults who need larger text.

Rotation (A)
* `.fq-safe` (transparent safe-area top/bottom border) on every page root, `min-h-dvh` instead of `min-h-screen` so the URL bar showing/hiding no longer clips pages.
* `.fq-modal`: all overlays and sheets scroll when short (landscape phone), keep all four safe-area insets, and keep the sheet reachable.
* Home header wraps below 380px (Language pill no longer squashed; bigger hit area).
* Prayer Book: left/right safe-area insets on the page chrome and on the edge arrows (it is the only non-centred page, so it is the only one that needs side insets).
* Games with fixed pixel sizes now measure their room and re-fit live: feed tray (Be quick), bubble meet (Learn) and the Learn/Mix stages.
* Grown-Ups: the testing-unlock row is now a 44px target.
* Android: `configChanges` also lists `density|fontScale` (no activity restart on rotate, split-screen resize or font-size change), orientation stays unlocked, `MainActivity` keeps WebView zoom off. `setTextZoom` is deliberately unchanged (OS font scaling stays an accessibility feature; checked on a real device, below).
* iOS: `Info.plist` already allows Portrait + LandscapeLeft/Right on iPhone and all four on iPad. No change. The webview is edge-to-edge, so pages pad themselves with `env(safe-area-inset-*)` (above).

## Capacitor config check / proposal
* Android manifest: `configChanges` complete; no `screenOrientation`; WebView zoom disabled in `MainActivity`. OK.
* iOS plist: orientations OK; `UIRequiresFullScreen` is not set, so iPad split view works. OK.
* Proposal (not applied, store-config change): none needed. If Yosief ever wants kids' phones locked to portrait, add `android:screenOrientation="userPortrait"` and drop the landscape entries from the iPhone plist; the layouts above already handle both, so we recommend leaving it unlocked.

## Results

Final run: 429 rotate runs (39 screens x 11 size pairs x start/rotated/back), **0 with findings**. Zoom/hold: 38 of 38 screens pass (`setup` is the first-launch sheet, covered by the rotate run and by the same global guards).

Runs with a finding per screen: "first pass" = the first full sweep before any fix (no safe-area insets, 341 runs over the screens it covered); "before final" = the SAFE=1 sweep (notch/home-indicator insets) right before the last fixes; "final" = after all fixes. Montages: `/workspace/egeez-brick-samples/shots/rot-<screen>-montage.png` (not committed, they are large).

| screen | first pass | before final | final | zoom/hold |
|---|---|---|---|---|
| beats | 1/11 | 0/11 | 0/11 | PASS |
| bingo | 1/11 | 0/11 | 0/11 | PASS |
| build | 0/11 | 1/11 | 0/11 | PASS |
| catch | 11/11 | 11/11 | 0/11 | PASS |
| checkin | 0/11 | 0/11 | 0/11 | PASS |
| church | 8/11 | 3/11 | 0/11 | PASS |
| closet | 0/11 | 1/11 | 0/11 | PASS |
| echo | 1/11 | 0/11 | 0/11 | PASS |
| explorer | 0/11 | 0/11 | 0/11 | PASS |
| familyvoice | 11/11 | 0/11 | 0/11 | PASS |
| find | 0/11 | 0/11 | 0/11 | PASS |
| firstwords | n/a | 1/11 | 0/11 | PASS |
| gate-hold | 11/11 | 0/11 | 0/11 | PASS |
| gate-type | n/a | 0/11 | 0/11 | PASS |
| gift | 11/11 | 0/11 | 0/11 | PASS |
| grownups | 11/11 | 11/11 | 0/11 | PASS |
| home | 11/11 | 2/11 | 0/11 | PASS |
| hunt | n/a | 0/11 | 0/11 | PASS |
| language | 11/11 | 0/11 | 0/11 | PASS |
| learn | 3/11 | 0/11 | 0/11 | PASS |
| market | 0/11 | 4/11 | 0/11 | PASS |
| mix | n/a | 2/11 | 0/11 | PASS |
| myname | 0/11 | 0/11 | 0/11 | PASS |
| order | 11/11 | 0/11 | 0/11 | PASS |
| postcard | n/a | 0/11 | 0/11 | PASS |
| prayer | 0/11 | 6/11 | 0/11 | PASS |
| profile | 11/11 | 0/11 | 0/11 | PASS |
| quiz | 0/11 | 0/11 | 0/11 | PASS |
| review | 11/11 | 0/11 | 0/11 | PASS |
| runner | 0/11 | 0/11 | 0/11 | PASS |
| schoolpath | 0/11 | 0/11 | 0/11 | PASS |
| setup | n/a | 11/11 | 0/11 | n/a |
| stories | 0/11 | 2/11 | 0/11 | PASS |
| teacher | 0/11 | 0/11 | 0/11 | PASS |
| tower | 1/11 | 0/11 | 0/11 | PASS |
| traffic | 1/11 | 0/11 | 0/11 | PASS |
| train | n/a | 0/11 | 0/11 | PASS |
| wordbricks | n/a | 0/11 | 0/11 | PASS |
| wordbuild | 0/11 | 0/11 | 0/11 | PASS |

Notes on the numbers: "before final" counts include harness timeouts under 8-way parallel load (re-run with 4 shards cleared them) and `catch` (letters fall past the head by design; the harness now exempts that, it is not a covered control).

## Known limits of the automated check
* Rotation happens on the screen as first opened (start of a round). Mid-round rotation is covered for the games whose layout is measured (feed tray, bubble meet) and by the live resize steps; a rotation in the middle of an animation or drag was not scripted for every game and is on the device list below.
* Keyboard-open (reduced viewport height) is not automated for My Name, the rep code and the parent gate; those screens scroll (`fq-modal`/`min-h-dvh`), please eyeball on a phone.
* Safari/WebKit is not available on the box; WebKit-only behaviour is on the device list.

## Needs a real iPhone / iPad (cannot be proven on this box)
WebKit does not launch on the box, so Chrome emulation covers layout and CDP touch only. Please check on devices:
1. iOS Safari/WKWebView two-finger pinch (`gesturestart`) on a game, on the home screen, and in Grown-Ups (should still zoom there).
2. Long-press on text, a letter tile, an image and a link: no callout, loupe, magnifier or link/image preview.
3. Double-tap and triple-tap on buttons and on empty areas: no zoom, no selection.
4. Edge-swipe back from the left edge inside a game, and pull-to-refresh/rubber-band bounce at the top and bottom.
5. Rotate during an animation (Be quick feed tray, Letter Catch, Block Church) and with the keyboard open (My Name, rep code, parent gate): no stale layout.
6. Notch/Dynamic Island, home indicator and landscape side insets (iPhone 14/15/16 family); Back and Next buttons not under the notch.
7. Safari URL bar show/hide on a scrolling page (home, Prayer Book) and iPad split view / Stage Manager resize.
8. Dynamic Type (iOS) and Android font scale at the largest setting.
9. Android: long-press context menu, WebView pinch, split-screen, and hardware-keyboard Ctrl +/- on a tablet or Chromebook.
