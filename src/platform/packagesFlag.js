/* The 1.4 free-download switch (VITE_PACKAGES=1). Its own module so
   paidBuyer.js can ask it without an import cycle. Off in every build
   shipping today. */
let flagOverride = null
export function packagesEnabled() {
  if (flagOverride != null) return flagOverride
  try { return import.meta.env?.VITE_PACKAGES === '1' } catch { return false }
}
/** Tests only. null = back to the env. */
export function __setPackagesFlag(v) { flagOverride = v }
