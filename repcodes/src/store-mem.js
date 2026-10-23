/* In-memory store with the same contract as store-ddb.js (tests). The
   conditional methods are synchronous inside, so they are atomic like
   DynamoDB's ConditionExpression. */
export function memStore() {
  const reps = new Map(), codes = new Map(), otp = new Map(), sess = new Map(), rl = new Map()
  const tick = () => new Promise((r) => setImmediate(r)) // force interleaving in race tests
  return {
    async getRep(id) { await tick(); return reps.get(id) ? { ...reps.get(id) } : null },
    async putRep(r) { reps.set(r.repId, { ...r }) },
    async listReps() { return [...reps.values()].map((r) => ({ ...r })) },
    async putCodeIfNew(c) { if (codes.has(c.code)) return false; codes.set(c.code, { ...c }); return true },
    async getCode(code) { await tick(); return codes.get(code) ? { ...codes.get(code) } : null },
    async markUsedIfUnused(code, at, household) {
      await tick()
      const c = codes.get(code)
      if (!c || c.status !== 'unused') return false
      c.status = 'used'; c.usedAt = at; c.household = household; return true
    },
    async voidIfUnused(code, at) {
      const c = codes.get(code)
      if (!c || c.status !== 'unused') return false
      c.status = 'void'; c.voidedAt = at; return true
    },
    async listCodesByRep(repId) { return [...codes.values()].filter((c) => c.repId === repId).map((c) => ({ ...c })) },
    async listAllCodes() { return [...codes.values()].map((c) => ({ ...c })) },
    async putOtp(e, r) { otp.set(e, { ...r }) }, async getOtp(e) { return otp.get(e) || null }, async deleteOtp(e) { otp.delete(e) },
    async putSession(h, s) { sess.set(h, s) }, async getSession(h) { return sess.get(h) || null }, async deleteSession(h) { sess.delete(h) },
    async hit(key, windowSec) {
      const k = `${key}#${Math.floor(Date.now() / 1000 / windowSec)}`
      const n = (rl.get(k) || 0) + 1; rl.set(k, n); return n
    },
  }
}
