import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'

const read = (p) => readFileSync(p, 'utf8')

describe('native rotation config', () => {
  const manifest = read('android/app/src/main/AndroidManifest.xml')
  it('Android handles rotation, resize and font/density changes without recreating the activity', () => {
    const cc = manifest.match(/android:configChanges="([^"]+)"/)[1].split('|')
    for (const k of ['orientation', 'screenSize', 'smallestScreenSize', 'screenLayout', 'keyboardHidden', 'density', 'fontScale']) {
      expect(cc).toContain(k)
    }
  })
  it('Android does not lock the orientation (kids may hold the device either way)', () => {
    expect(manifest).not.toMatch(/screenOrientation/)
  })
  it('iOS lets iPhone and iPad rotate', () => {
    const plist = read('ios/App/App/Info.plist')
    const phone = plist.match(/UISupportedInterfaceOrientations<\/key>\s*<array>([\s\S]*?)<\/array>/)[1]
    expect(phone).toMatch(/Portrait/)
    expect(phone).toMatch(/LandscapeLeft/)
    expect(phone).toMatch(/LandscapeRight/)
    const pad = plist.match(/UISupportedInterfaceOrientations~ipad<\/key>\s*<array>([\s\S]*?)<\/array>/)[1]
    expect(pad.match(/UIInterfaceOrientation/g).length).toBe(4)
  })
  it('the Android WebView keeps its own zoom off', () => {
    const main = read('android/app/src/main/java/net/promisechain/fidelquest/MainActivity.java')
    expect(main).toMatch(/setSupportZoom\(false\)/)
    expect(main).toMatch(/setBuiltInZoomControls\(false\)/)
  })
})

describe('audit tooling is in the repo', () => {
  it('has the rotate and zoom check scripts and the audit doc', () => {
    for (const f of ['tools/rotate-check.py', 'tools/zoom-check.py', 'docs/rotation-zoom-audit.md']) {
      expect(existsSync(f), f).toBe(true)
    }
    expect(read('tools/rotate-check.py')).toMatch(/set_viewport_size/)
    expect(read('tools/zoom-check.py')).toMatch(/dispatchTouchEvent/)
  })
})
