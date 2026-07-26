/* Owner notifications on new submissions. Same gmail-service transporter as
   PROMISECHAIN_BE utils/email.js, but a silent console fallback when SMTP
   creds are unset so dev/tests never depend on email working.              */
import nodemailer from 'nodemailer'
import config from './config.js'

const enabled = Boolean(config.email.user && config.email.pass)
const transporter = enabled
  ? nodemailer.createTransport({ service: 'gmail', auth: { user: config.email.user, pass: config.email.pass } })
  : null

export async function sendTo(to, subject, lines) {
  const text = lines.filter(Boolean).join('\n')
  if (!enabled || !to) {
    console.log(`[mail:skipped] to=${to || '-'} ${subject}\n${text}`)
    return { skipped: true }
  }
  try {
    await transporter.sendMail({ from: config.email.user, to, subject, text })
    return { sent: true }
  } catch (err) {
    console.error('[mail:error]', err.message)
    return { error: true } // never fail the request because email failed
  }
}

export const notifyOwner = (subject, lines) => sendTo(config.email.notifyTo, subject, lines)
