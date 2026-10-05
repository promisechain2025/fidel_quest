/* ============================================================================
   PUBLIC URLS — platform layer
   ----------------------------------------------------------------------------
   Files in `public/` are copied to the root of the build. Two hosts serve
   that build from different roots:

     - Web (easygeez.com): `VITE_BASE=/app/` so the PWA, its voice, and its
       paintings live at /app/, /app/audio/, and /app/art/.
     - Capacitor and `vite` dev: base `/`, so the same files are /audio/ and
       /art/.

   A root-absolute path such as `/audio/fidel/letters/ha-1.mp3` skips the
   base and 404s on the web PWA. `publicUrl` joins the path onto
   `import.meta.env.BASE_URL` (always a trailing-slash prefix, `/` or
   `/app/`).
   ========================================================================== */

/**
 * Join a Vite base (`/`, `/app/`, or `/app`) with a path under `public/`.
 * The path may be root-absolute (`/audio/...`) or relative (`audio/...`).
 * Pure, so both hosts can be tested without rebuilding.
 */
export function joinPublicUrl(baseUrl, path) {
  const raw = baseUrl || '/'
  const base = raw.endsWith('/') ? raw : `${raw}/`
  const rel = String(path ?? '').replace(/^\/+/, '')
  return `${base}${rel}`
}

/** `publicUrl('/audio/fidel/')` is `/audio/fidel/` or `/app/audio/fidel/`. */
export function publicUrl(path) {
  return joinPublicUrl(import.meta.env.BASE_URL, path)
}

/** Letter and word clips, including the trailing slash the engine concatenates onto. */
export const FIDEL_AUDIO_BASE = publicUrl('/audio/fidel/')
/** Coverage manifest. Absent is a supported state (the engine chimes). */
export const FIDEL_MANIFEST_URL = publicUrl('/audio/fidel/manifest.json')
