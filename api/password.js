/* ============================================================================
   PASSWORD HASHING — scrypt on the threadpool, with bcrypt still verifiable
   ----------------------------------------------------------------------------
   `bcryptjs` is a pure-JS implementation, so every hash and compare runs on
   the single Node thread. Under load - and login is reachable by anyone -
   that turns the auth route into a CPU amplifier that stalls the whole API:
   measured, 60 concurrent bad logins took /healthz from 1ms to 4.7s.

   `crypto.scrypt` is the boring answer. It is in Node core, needs no native
   build step, and runs on the libuv threadpool, so hashing no longer blocks
   the event loop.

   MIGRATION: `verify()` still accepts the old `$2a$/$2b$` bcrypt hashes, so
   existing accounts keep working; `needsRehash()` says when a stored hash is
   the old format and the login route quietly re-hashes it with scrypt on the
   next successful sign-in. Nobody is logged out, and the old algorithm drains
   away on its own.

   Format: scrypt$N$r$p$<salt-b64>$<hash-b64>
   ========================================================================== */
import crypto from 'node:crypto'
import { promisify } from 'node:util'
import bcrypt from 'bcryptjs'

const scrypt = promisify(crypto.scrypt)

// N=2^15 is the usual interactive-login setting: ~50-80ms and 32MB, which is
// slow enough to be a real barrier and fast enough that a parent signing in
// does not notice. maxmem must be raised past the 32MB default or Node
// refuses these parameters.
const N = 32768
const r = 8
const p = 1
const KEYLEN = 32
const MAXMEM = 192 * 1024 * 1024

const isBcrypt = (h) => typeof h === 'string' && /^\$2[aby]?\$/.test(h)

export async function hash(password) {
  const salt = crypto.randomBytes(16)
  const key = await scrypt(String(password), salt, KEYLEN, { N, r, p, maxmem: MAXMEM })
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${key.toString('base64')}`
}

/** Constant-time verify against either format. Never throws on junk input. */
export async function verify(password, stored) {
  if (!stored) return false
  try {
    if (isBcrypt(stored)) return await bcrypt.compare(String(password), stored)
    const parts = String(stored).split('$')
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false
    const [, n, rr, pp, saltB64, keyB64] = parts
    const salt = Buffer.from(saltB64, 'base64')
    const expected = Buffer.from(keyB64, 'base64')
    const actual = await scrypt(String(password), salt, expected.length, {
      N: Number(n), r: Number(rr), p: Number(pp), maxmem: MAXMEM,
    })
    return crypto.timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

/** True when a stored hash is the old bcrypt format and should be upgraded. */
export const needsRehash = (stored) => isBcrypt(stored)

/** A real hash of a value nobody can supply, so the "no such account" branch
    of login costs the same as the real one (no timing oracle). Built once at
    module load rather than per request. */
export const DUMMY_HASH = await hash(crypto.randomBytes(32).toString('hex'))
