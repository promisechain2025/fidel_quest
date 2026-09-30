import { describe, it, expect } from 'vitest'
import { APP_NAME, HYENA_NAME } from './brand'
import { t } from './i18n'

describe('English chrome names', () => {
  it('keeps the Latin brand and the English hyena name', () => {
    expect(APP_NAME).toBe('eGeez')
    expect(HYENA_NAME).toBe('Jibby')
    expect(t('paySupport', 'Support eGeez')).toBe('Support eGeez')
    expect(t('huntSub', 'Jibby hid the letters! Find them by sound')).toBe('Jibby hid the letters! Find them by sound')
  })
})
