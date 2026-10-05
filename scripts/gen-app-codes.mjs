/* Mint EGZ website-unlock codes (support, a replacement for a lost phone,
   a gifted install). The paid app also shows one code of its own, derived
   from that install; these extra codes unlock the same way.

   Usage:
     node scripts/gen-app-codes.mjs [count]
     node scripts/gen-app-codes.mjs --install <install-id>

   Uses src/platform/appCodes.js so minting and checking cannot drift.
   There is no server: a code is valid when its checksum matches. */
import { randomInt } from 'node:crypto'
import { mintAppCode, codeForInstall, CODE_ALPHABET } from '../src/platform/appCodes.js'

const args = process.argv.slice(2)
const installAt = args.indexOf('--install')
if (installAt !== -1) {
  const id = args[installAt + 1]
  if (!id) {
    console.error('usage: node scripts/gen-app-codes.mjs --install <install-id>')
    process.exit(1)
  }
  console.log(codeForInstall(id))
} else {
  const count = Math.max(1, Math.min(1000, Number(args[0]) || 10))
  for (let i = 0; i < count; i++) {
    let body = ''
    for (let j = 0; j < 4; j++) body += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
    console.log(mintAppCode(body))
  }
}
