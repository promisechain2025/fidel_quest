/* Mint EGZ app-unlock codes (e.g. gifts, promos, manual sales).
   Usage: node scripts/gen-app-codes.mjs [count]
   Uses the app's own minting (src/platform/appCodes.js) so minting and
   checking can never drift. */
import { randomInt } from 'node:crypto'
import { mintAppCode, CODE_ALPHABET } from '../src/platform/appCodes.js'

const count = Math.max(1, Math.min(1000, Number(process.argv[2]) || 10))
for (let i = 0; i < count; i++) {
  let body = ''
  for (let j = 0; j < 4; j++) body += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  console.log(mintAppCode(body))
}
