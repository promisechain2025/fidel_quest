/* Family Pack gate: the paid app includes ONE child profile; a 2nd-6th
   child needs the family_pack in-app purchase. The purchase (and its price)
   is only ever reachable behind the parental gate, and Restore purchases is
   always offered next to Buy. */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'

const iap = vi.hoisted(() => ({
  available: true,
  buy: 'purchased',
  restore: 'none',
}))
vi.mock('./platform/iap', async () => {
  const fp = await import('./platform/familyPack')
  return {
    iapAvailable: () => iap.available,
    familyPackStorePrice: async () => '$4.99',
    buyFamilyPack: vi.fn(async () => { if (iap.buy === 'purchased') fp.unlockFamilyPack('store'); return iap.buy }),
    restoreFamilyPack: vi.fn(async () => { if (iap.restore === 'restored') fp.unlockFamilyPack('store'); return iap.restore }),
  }
})

import ProfilePicker from './components/ProfilePicker'
import FamilyPackOffer from './components/FamilyPackOffer'
import { loadProfiles, addProfile, profileCount, MAX_PROFILES } from './platform/profiles'
import { needsFamilyPack, familyPackUnlocked, unlockFamilyPack, revokeStoreFamilyPack, FREE_PROFILES } from './platform/familyPack'

const passGate = () => {
  fireEvent.pointerDown(screen.getByText('Hold me'))
  act(() => { vi.advanceTimersByTime(2100) })
  const m = /What is (\d+) ([×+]) (\d+)\?/.exec(screen.getByText(/What is/).textContent)
  const ans = m[2] === '×' ? Number(m[1]) * Number(m[3]) : Number(m[1]) + Number(m[3])
  for (const d of String(ans)) fireEvent.click(screen.getByRole('button', { name: d }))
  fireEvent.click(screen.getByRole('button', { name: 'OK' }))
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  Object.assign(iap, { available: true, buy: 'purchased', restore: 'none' })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('Family Pack entitlement rules', () => {
  it('includes exactly one child; the 2nd needs the pack', () => {
    expect(FREE_PROFILES).toBe(1)
    loadProfiles()
    expect(needsFamilyPack(profileCount())).toBe(true)
    expect(addProfile('Abel')).toBeNull()
    expect(profileCount()).toBe(1)
  })

  it('with the pack, up to six children', () => {
    unlockFamilyPack('store')
    loadProfiles()
    for (let i = 1; i < MAX_PROFILES; i++) expect(addProfile(`Kid ${i}`)).toBeTruthy()
    expect(addProfile('Seventh')).toBeNull()
    expect(profileCount()).toBe(6)
  })

  it('never removes children who already have a profile', () => {
    unlockFamilyPack('store')
    loadProfiles(); addProfile('Abel'); addProfile('Hanna')
    revokeStoreFamilyPack()
    expect(familyPackUnlocked()).toBe(false)
    expect(profileCount()).toBe(3)
    expect(addProfile('Dawit')).toBeNull()
  })

  it('a refund drops only a STORE unlock; older unlocks from previous versions stay', () => {
    unlockFamilyPack('code')
    expect(revokeStoreFamilyPack()).toBe(false)
    expect(familyPackUnlocked()).toBe(true)
    unlockFamilyPack('store')
    expect(revokeStoreFamilyPack()).toBe(true)
    expect(familyPackUnlocked()).toBe(false)
  })
})

describe('profile picker: locked 2nd profile', () => {
  it('a child sees "ask a grown-up" - no price, no Buy - and the purchase sits behind the gate', async () => {
    vi.useFakeTimers()
    localStorage.setItem('fq.nickname', 'Selam')
    loadProfiles()
    const reload = vi.fn()
    render(<ProfilePicker onClose={() => {}} reload={reload} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add a child (needs the Family Pack)' }))
    expect(screen.getByTestId('pack-locked')).toBeInTheDocument()
    expect(screen.queryByText(/\$4\.99/)).toBeNull()
    expect(screen.queryByRole('button', { name: /Get the Family Pack/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Restore purchases/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: "I'm a grown-up" }))
    passGate()
    await act(async () => { await Promise.resolve() })
    expect(screen.getByRole('button', { name: 'Get the Family Pack ($4.99)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restore purchases' })).toBeInTheDocument()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Get the Family Pack ($4.99)' })) })
    // Bought: straight on to the new-player form.
    expect(screen.getByText('New player')).toBeInTheDocument()
    expect(familyPackUnlocked()).toBe(true)
  })

  it('with the pack owned, + goes straight to the new-player form', () => {
    unlockFamilyPack('store')
    loadProfiles()
    render(<ProfilePicker onClose={() => {}} reload={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Add a child/ }))
    expect(screen.getByText('New player')).toBeInTheDocument()
  })
})

describe('FamilyPackOffer (grown-up side)', () => {
  it('Restore purchases unlocks when the store has the pack', async () => {
    iap.restore = 'restored'
    const onUnlocked = vi.fn()
    render(<FamilyPackOffer onUnlocked={onUnlocked} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Restore purchases' })) })
    expect(onUnlocked).toHaveBeenCalled()
    expect(screen.getByTestId('family-pack-owned')).toBeInTheDocument()
  })

  it('Restore with nothing to restore says so', async () => {
    render(<FamilyPackOffer />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Restore purchases' })) })
    expect(screen.getByRole('status').textContent).toMatch(/No Family Pack was found/)
  })

  it('Ask to Buy (pending) does not unlock', async () => {
    iap.buy = 'pending'
    render(<FamilyPackOffer />)
    await act(async () => { await Promise.resolve() })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Get the Family Pack/ })) })
    expect(screen.getByRole('status').textContent).toMatch(/approve/)
    expect(familyPackUnlocked()).toBe(false)
  })

  it('on the web there is no Buy button - it says where to get it', () => {
    render(<FamilyPackOffer store={false} native={false} />)
    expect(screen.queryByRole('button', { name: /Get the Family Pack/ })).toBeNull()
    expect(screen.getByText(/in-app purchase in the eGeez app/)).toBeInTheDocument()
  })
})
