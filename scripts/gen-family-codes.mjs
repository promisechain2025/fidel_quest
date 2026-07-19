// Mint Family Pack redeem codes (see src/platform/familyPack.js).
// Usage: node scripts/gen-family-codes.mjs [count]
// Prints one code per line, e.g. FAM7KQ2X. Hand one code per web purchase
// or community grant; the app validates them fully offline.
import { mintFamilyCode } from '../src/platform/familyPack.js'
import { randomInt } from 'node:crypto'

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const count = Math.max(1, Math.min(500, Number(process.argv[2]) || 10))
const seen = new Set()
while (seen.size < count) {
  let payload = ''
  for (let i = 0; i < 4; i++) payload += ALPHABET[randomInt(ALPHABET.length)]
  const code = mintFamilyCode(payload)
  if (code) seen.add(code)
}
for (const c of seen) console.log(c)
