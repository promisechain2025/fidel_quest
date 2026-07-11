/* ============================================================================
   KEEP THE SCREEN AWAKE — platform layer
   ----------------------------------------------------------------------------
   Classroom surfaces (the TV chant board) must not dim or lock mid-lesson:
   the teacher is not touching the phone while the class chants. One hook,
   one plugin (@capacitor-community/keep-awake): native builds flip the OS
   idle timer, and the plugin's web implementation uses the Screen Wake Lock
   API. Web wake locks are silently released when the tab is hidden, so the
   hook re-acquires on visibilitychange. Failure is always harmless - the
   screen just behaves as it always did.
   ========================================================================== */
import { useEffect } from 'react'

async function acquire() {
  try {
    const { KeepAwake } = await import('@capacitor-community/keep-awake')
    await KeepAwake.keepAwake()
    return () => { KeepAwake.allowSleep().catch(() => {}) }
  } catch {
    return () => {}
  }
}

/** Hold a screen wake lock while `active` (and the component) lives. */
export function useKeepAwake(active = true) {
  useEffect(() => {
    if (!active) return undefined
    let disposed = false
    let release = () => {}
    const grab = () => acquire().then((r) => { disposed ? r() : (release = r) })
    const onVis = () => { if (document.visibilityState === 'visible') grab() }
    grab()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVis)
      release()
    }
  }, [active])
}
