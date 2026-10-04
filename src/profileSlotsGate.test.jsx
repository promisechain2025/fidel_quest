/* Kids-profile slots: the paid app includes ONE child profile; each further
   child is a one-time in-app purchase, bought in order (2nd $4.99, 3rd-6th
   $2.49), up to 6. Old Family Pack owners keep all 6. The purchase (and its
   price) is only ever reachable behind the parental gate, and Restore
   purchases is always offered next to Buy. */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'

const iap = vi.hoisted(() => ({ available: true, buy: 'purchased', restore: 'none', restoreSlots: [] }))
vi.mock('./platform/iap', async () => {
  const ps = await import('./platform/profileSlots')
  return {
    iapAvailable: () => iap.available,
    slotStorePrice: async (n) => (n === 2 ? '$4.99' : '$2.49'),
    buyNextProfileSlot: vi.fn(async () => {
      if (iap.buy === 'purchased') ps.setOwnedSlots([ps.slotProductId(ps.nextSlot())])
      return iap.buy
    }),
    restoreProfileSlots: vi.fn(async () => {
      ps.setOwnedSlots(iap.restoreSlots, 'replace')
      return iap.restore
    }),
  }
})

import ProfilePicker from './components/ProfilePicker'
import ProfileSlotOffer from './components/ProfileSlotOffer'
import { loadProfiles, addProfile, profileCount } from './platform/profiles'
import {
  allowedProfiles, needsSlot, nextSlot, setOwnedSlots, slotProductId, SLOT_PRODUCTS, SLOT_PRICE_FALLBACK, FREE_PROFILES, MAX_SLOTS,
  grantLegacyFamilyPack, revokeStoreLegacyPack, legacyFamilyPack,
} from './platform/profileSlots'

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
  Object.assign(iap, { available: true, buy: 'purchased', restore: 'none', restoreSlots: [] })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('profile slot rules', () => {
  it('products and prices: profile_slot_2 $4.99, profile_slot_3..6 $2.49', () => {
    expect(SLOT_PRODUCTS).toEqual(['profile_slot_2', 'profile_slot_3', 'profile_slot_4', 'profile_slot_5', 'profile_slot_6'])
    expect(SLOT_PRICE_FALLBACK).toEqual({ 2: '$4.99', 3: '$2.49', 4: '$2.49', 5: '$2.49', 6: '$2.49' })
    expect(FREE_PROFILES).toBe(1)
    expect(MAX_SLOTS).toBe(6)
  })

  it('includes exactly one child; the 2nd needs profile_slot_2', () => {
    loadProfiles()
    expect(allowedProfiles()).toBe(1)
    expect(needsSlot(profileCount())).toBe(true)
    expect(nextSlot()).toBe(2)
    expect(addProfile('Abel')).toBeNull()
    setOwnedSlots(['profile_slot_2'])
    expect(addProfile('Abel')).toBeTruthy()
    expect(addProfile('Hanna')).toBeNull() // the 3rd needs profile_slot_3
    expect(nextSlot()).toBe(3)
  })

  it('slots count only in order', () => {
    setOwnedSlots(['profile_slot_3', 'profile_slot_4'])
    expect(allowedProfiles()).toBe(1)
    setOwnedSlots(['profile_slot_2'])
    expect(allowedProfiles()).toBe(4)
    expect(nextSlot()).toBe(5)
  })

  it('all five slots: six children, then the cap', () => {
    setOwnedSlots(SLOT_PRODUCTS)
    loadProfiles()
    for (let i = 1; i < 6; i++) expect(addProfile(`Kid ${i}`)).toBeTruthy()
    expect(addProfile('Seventh')).toBeNull()
    expect(nextSlot()).toBe(0)
  })

  it('old Family Pack owners (store or 1.2 code) own all 6 slots', () => {
    localStorage.setItem('fq.familypack.v1', JSON.stringify({ unlocked: true, method: 'code' }))
    expect(allowedProfiles()).toBe(6)
    expect(revokeStoreLegacyPack()).toBe(false) // never revoke a 1.2 code unlock
    localStorage.clear()
    grantLegacyFamilyPack()
    expect(legacyFamilyPack()).toBe(true)
    expect(allowedProfiles()).toBe(6)
    expect(revokeStoreLegacyPack()).toBe(true)
    expect(allowedProfiles()).toBe(1)
  })

  it('a refund (store mirror) never removes children who already have a profile', () => {
    setOwnedSlots(['profile_slot_2', 'profile_slot_3'])
    loadProfiles(); addProfile('Abel'); addProfile('Hanna')
    setOwnedSlots([], 'replace')
    expect(profileCount()).toBe(3)
    expect(addProfile('Dawit')).toBeNull()
  })
})

describe('profile picker: locked new profile', () => {
  it('a child sees "ask a grown-up" - no price, no Buy - and the purchase sits behind the gate', async () => {
    vi.useFakeTimers()
    localStorage.setItem('fq.nickname', 'Selam')
    loadProfiles()
    render(<ProfilePicker onClose={() => {}} reload={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add a child (needs a grown-up to unlock)' }))
    expect(screen.getByTestId('pack-locked')).toBeInTheDocument()
    expect(screen.queryByText(/\$\d/)).toBeNull()
    expect(screen.queryByRole('button', { name: /Unlock profile/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Restore purchases/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: "I'm a grown-up" }))
    passGate()
    await act(async () => { await Promise.resolve() })
    expect(screen.getByText('Add child 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unlock profile 2 ($4.99)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restore purchases' })).toBeInTheDocument()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Unlock profile 2 ($4.99)' })) })
    expect(screen.getByText('New player')).toBeInTheDocument() // bought: straight on to the form
    expect(allowedProfiles()).toBe(2)
  })

  it('the 3rd child is offered at the $2.49 price', async () => {
    vi.useFakeTimers()
    setOwnedSlots(['profile_slot_2'])
    loadProfiles(); addProfile('Abel')
    render(<ProfilePicker onClose={() => {}} reload={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add a child (needs a grown-up to unlock)' }))
    fireEvent.click(screen.getByRole('button', { name: "I'm a grown-up" }))
    passGate()
    await act(async () => { await Promise.resolve() })
    expect(screen.getByRole('button', { name: 'Unlock profile 3 ($2.49)' })).toBeInTheDocument()
  })

  it('with a free slot, + goes straight to the new-player form', () => {
    setOwnedSlots(['profile_slot_2'])
    loadProfiles()
    render(<ProfilePicker onClose={() => {}} reload={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Add a child/ }))
    expect(screen.getByText('New player')).toBeInTheDocument()
  })
})

describe('ProfileSlotOffer (grown-up side)', () => {
  it('Restore purchases brings back bought slots', async () => {
    iap.restore = 'restored'; iap.restoreSlots = ['profile_slot_2', 'profile_slot_3']
    const onUnlocked = vi.fn()
    render(<ProfileSlotOffer onUnlocked={onUnlocked} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Restore purchases' })) })
    expect(onUnlocked).toHaveBeenCalledWith(3)
    expect(screen.getByText('Add child 4')).toBeInTheDocument()
  })

  it('Restore with nothing to restore says so', async () => {
    render(<ProfileSlotOffer />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Restore purchases' })) })
    expect(screen.getByRole('status').textContent).toMatch(/No profile purchases were found/)
  })

  it('Ask to Buy (pending) does not unlock', async () => {
    iap.buy = 'pending'
    render(<ProfileSlotOffer />)
    await act(async () => { await Promise.resolve() })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Unlock profile 2/ })) })
    expect(screen.getByRole('status').textContent).toMatch(/approve/)
    expect(allowedProfiles()).toBe(1)
  })

  it('compact (Grown-Ups, nothing needed now): count + Restore purchases', () => {
    setOwnedSlots(['profile_slot_2'])
    render(<ProfileSlotOffer compact />)
    expect(screen.getByTestId('slots-count').textContent).toMatch(/2 of 6/)
    expect(screen.getByRole('button', { name: 'Restore purchases' })).toBeInTheDocument()
  })

  it('all six owned: no Buy, no Restore needed', () => {
    setOwnedSlots(SLOT_PRODUCTS)
    render(<ProfileSlotOffer />)
    expect(screen.getByText('All 6 kids profiles unlocked on this device.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
    expect(slotProductId(6)).toBe('profile_slot_6')
  })

  it('on the web there is no Buy button - it says where to get it', () => {
    render(<ProfileSlotOffer store={false} native={false} />)
    expect(screen.queryByRole('button', { name: /Unlock profile/ })).toBeNull()
    expect(screen.getByText(/in-app purchases in the eGeez app/)).toBeInTheDocument()
  })
})
