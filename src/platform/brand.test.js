import { describe, it, expect } from 'vitest'
import { t, APP_NAME, HYENA_NAME } from './i18n'

describe('kid-facing names', () => {
  it('keeps the Ge\'ez brand and the hyena name on screen', () => {
    expect(APP_NAME).toBe('ኢግእዝ')
    expect(HYENA_NAME).toBe('ጅብ')
    expect(t('appName', 'ኢግእዝ')).toBe('ኢግእዝ')
    expect(t('paySupport', 'Support eGeez')).toBe('Support ኢግእዝ')
    expect(t('huntSub', 'ጅብ hid the letters! Find them by sound')).toContain('ጅብ')
    expect(t('runBossAttack', 'ጅብ attacks!')).toBe('ጅብ attacks!')
    expect(t('brandRewriteProbe', 'Jibby and eGeez')).toBe('ጅብ and ኢግእዝ')
  })
})
