/* Class invite and homework links for the web teacher dashboard.
   The website does not import the app (vite.config.js), so these mirror
   encodeClassInvite / encodeAssignment in src/platform/classroom.js.
   src/platform/teacherDashboard.test.js decodes them with the app's own
   decoders, so the two cannot drift apart. */
import { APP_URL } from './config.js'

export function b64url(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const cleanName = (s) => String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 24)
const root = (appUrl) => String(appUrl || APP_URL).replace(/\/+$/, '')

/** Invite link: joining also turns on class sync (y:1) and takes the goal. */
export function classInviteUrl({ code, teacher, goalMin }, appUrl) {
  const p = { v: 1, c: String(code).toUpperCase(), t: cleanName(teacher) || 'Teacher', y: 1 }
  if (goalMin) p.g = Math.max(5, Math.min(180, Math.round(goalMin)))
  return `${root(appUrl)}/#class=${b64url(JSON.stringify(p))}`
}

/** Homework link: the same seed for everyone, so results are comparable. */
export function homeworkUrl({ code, teacher, homework }, appUrl) {
  const { familyIds, count, due, seed, orders } = homework
  const p = { v: 1, c: String(code).toUpperCase(), t: cleanName(teacher) || 'Teacher', f: familyIds, n: count, due, s: seed, o: orders?.length ? orders : [1] }
  return `${root(appUrl)}/#assign=${b64url(JSON.stringify(p))}`
}
