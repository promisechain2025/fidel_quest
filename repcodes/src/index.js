import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { ddbStore } from './store-ddb.js'
import { makeApp } from './app.js'

const ses = new SESv2Client({})
const FROM = process.env.MAIL_FROM || 'eGeez <noreply@easygeez.com>'
async function sendMail(to, otp) {
  await ses.send(new SendEmailCommand({
    FromEmailAddress: FROM, Destination: { ToAddresses: [to] },
    Content: { Simple: {
      Subject: { Data: `eGeez sign-in code: ${otp}` },
      Body: { Text: { Data: `Your eGeez representative dashboard sign-in code is ${otp}\n\nIt works for 10 minutes. If you did not ask for it, ignore this email.\n` } },
    } },
  }))
}
const log = (event, data) => console.log(JSON.stringify({ event, ...data }))
export const handler = makeApp({ store: ddbStore(), sendMail, log })
