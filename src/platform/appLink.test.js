import { describe, it, expect } from 'vitest'
import { appLinkUrl, linkBase, CANONICAL_APP_URL } from './appLink'
import { assignmentUrl, classUrl, receiptUrl } from './classroom'

const loc = (href) => new URL(href)
const INVITE = { code: 'STMARY', teacher: 'Ms. Hana' }
const ASSIGN = { code: 'STMARY', teacher: 'Ms. Hana', familyIds: ['ha'], count: 8, due: '2026-10-13', seed: 7, orders: [1] }
const RECEIPT = { code: 'STMARY', student: 'Liya', score: 7, total: 8, day: '2026-10-07', assignmentSeed: 7, missed: ['re'] }

describe('linkBase', () => {
  it('keeps origin + path, drops query, hash, index.html and trailing slashes', () => {
    expect(linkBase('https://easygeez.com/app/')).toBe('https://easygeez.com/app')
    expect(linkBase('https://easygeez.com/app/index.html?x=1#y')).toBe('https://easygeez.com/app')
    expect(linkBase('https://easygeez.com')).toBe('https://easygeez.com')
    expect(linkBase('http://localhost:5173/')).toBe('http://localhost:5173')
    expect(linkBase('')).toBe('')
  })
})

describe('appLinkUrl', () => {
  it('web PWA under /app/ links back into /app/', () => {
    const base = appLinkUrl({ env: '', native: false, location: loc('https://easygeez.com/app/'), base: '/app/' })
    expect(base).toBe('https://easygeez.com/app')
    expect(assignmentUrl(ASSIGN, base)).toMatch(/^https:\/\/easygeez\.com\/app\/#assign=/)
  })
  it('a root build (local vite) stays at the root', () => {
    expect(appLinkUrl({ env: '', native: false, location: loc('http://localhost:5173/'), base: '/' })).toBe('http://localhost:5173')
  })
  it('VITE_APP_URL wins when it is a web URL', () => {
    expect(appLinkUrl({ env: 'https://easygeez.com/app', native: false, location: loc('https://staging.example/'), base: '/' })).toBe('https://easygeez.com/app')
    expect(appLinkUrl({ env: 'https://easygeez.com/app/', native: true, location: loc('capacitor://localhost/'), base: '/' })).toBe('https://easygeez.com/app')
  })
  it('Capacitor (no web path) always shares the public app URL', () => {
    for (const origin of ['capacitor://localhost/', 'https://localhost/']) {
      const base = appLinkUrl({ env: '', native: true, location: loc(origin), base: '/' })
      expect(base).toBe(CANONICAL_APP_URL)
      expect(classUrl(INVITE, base)).toMatch(/^https:\/\/easygeez\.com\/app\/#class=/)
      expect(receiptUrl(RECEIPT, base)).toMatch(/^https:\/\/easygeez\.com\/app\/#receipt=/)
    }
  })
  it('ignores a non-web VITE_APP_URL (e.g. a store link) and a missing location', () => {
    expect(appLinkUrl({ env: 'itms-apps://x', native: true, location: null, base: '/' })).toBe(CANONICAL_APP_URL)
    expect(appLinkUrl({ env: undefined, native: false, location: null, base: '/' })).toBe(CANONICAL_APP_URL)
  })
})
