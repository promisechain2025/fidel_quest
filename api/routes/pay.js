/* Family Pack purchase via Stripe Checkout.

   Flow: website POSTs /api/pay/checkout -> buyer pays on Stripe's hosted
   page -> Stripe webhooks checkout.session.completed -> we mint a FAM
   unlock code (the app's existing offline redeem-code system - zero app
   changes) and email it -> the success page polls /api/pay/order/:id and
   shows the code. Fulfillment is a single atomic claim (createOrderIfAbsent)
   shared by the webhook and the poll's inline fallback, so double delivery,
   webhook retries, and the webhook-vs-poll race all resolve to exactly one
   code and one email.

   Dormant until keys (repo convention): without STRIPE_SECRET_KEY every
   endpoint answers 503 and the website shows its coming-soon state.       */
import { Router, raw } from 'express'
import Stripe from 'stripe'
import config from '../config.js'
import { store } from '../store.js'
import { sendTo, notifyOwner } from '../mailer.js'
import { rateLimit } from '../middleware.js'
import { mintRandomCode, CODE_PREFIX, APP_CODE_PREFIX } from '../familyCode.js'

const checkoutLimit = rateLimit({ max: 10, key: 'pay-checkout' })
// The success page polls this - generous on purpose (the forms bucket would
// starve a 2s poll in 40 seconds).
const orderLimit = rateLimit({ max: 300, key: 'pay-order' })

const secretKey = () => process.env.STRIPE_SECRET_KEY || ''
const webhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET || ''
const siteUrl = () => (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '')

/* Two one-time products: the app itself, and the Family Pack add-on.
   Prices/dashboard Price ids are env-driven; codes redeem in the app
   (EGZ: SupportAsk "Have a code?"; FAM: Grown-ups Family Pack input) on
   any platform - buy once, never twice. */
const PRODUCTS = {
  app: {
    prefix: APP_CODE_PREFIX,
    name: 'eGeez - the full app',
    description: 'One-time unlock of the whole eGeez journey, on web and in the mobile apps. Delivered as an EGZ unlock code.',
    cents: () => Number(process.env.APP_PRICE_CENTS || 1299),
    priceId: () => process.env.STRIPE_PRICE_ID_APP || '',
    redeemHint: [
      'To activate: open eGeez, and when it asks, choose "Have a code?"',
      'and enter it. One code unlocks the app on web and in the store',
      'builds - you never pay twice.',
    ],
  },
  family_pack: {
    prefix: CODE_PREFIX,
    name: 'eGeez Family Pack',
    description: 'One-time add-on: a separate learning path for every child in the family (up to 6) on one device. Delivered as a FAM unlock code.',
    cents: () => Number(process.env.FAMILY_PACK_PRICE_CENTS || 499),
    priceId: () => process.env.STRIPE_PRICE_ID_FAMILY || process.env.STRIPE_PRICE_ID || '',
    redeemHint: [
      'To activate: open eGeez, go to the Grown-ups corner, choose',
      'Family Pack, and enter the code. One code unlocks profiles for',
      'every child in your family on that device.',
    ],
  },
}
const productOf = (key) => PRODUCTS[key] || PRODUCTS.app

/* Lazy + injectable client: read env at request time (requireAdminToken
   pattern) and let tests pass a fake via createApp({ stripeClient }). */
let injected = null
let cached = null
export function setStripeClient(client) { injected = client; cached = null }
function stripeClient() {
  if (injected) return injected
  if (!secretKey()) return null
  if (!cached) cached = new Stripe(secretKey())
  return cached
}

async function mintUniqueCode(prefix) {
  for (let i = 0; i < 20; i++) {
    const code = mintRandomCode(prefix)
    if (!(await store.orderCodeExists(code))) return code
  }
  // 31^4 payloads; 20 straight collisions means the space is nearly spent.
  throw new Error('Could not mint a unique code')
}

/** The one fulfillment path. Returns the order; emails only on first claim. */
async function fulfill(session) {
  const productKey = PRODUCTS[session.metadata?.product] ? session.metadata.product : 'app'
  const product = productOf(productKey)
  const email = session.customer_details?.email || session.customer_email || ''
  const code = await mintUniqueCode(product.prefix)
  const { order, created } = await store.createOrderIfAbsent({
    sessionId: session.id, email, code, product: productKey,
  })
  if (created) {
    sendTo(email, `Your ${product.name} unlock code`, [
      'Thank you for supporting eGeez!',
      '',
      `Your unlock code: ${order.code}`,
      '',
      ...product.redeemHint,
      '',
      'Keep this email - the code also works after a reinstall.',
    ])
    notifyOwner(`${product.name} sold`, [`Order: ${order.sessionId}`, `Buyer: ${email || '-'}`, `Code: ${order.code}`])
  }
  return order
}

const paidStatus = (s) => s?.payment_status === 'paid'

/* --- webhook handler: exported for the raw-body mount in app.js --------- */
export function webhookHandler() {
  return [raw({ type: 'application/json' }), async (req, res) => {
    const stripe = stripeClient()
    if (!stripe || !webhookSecret()) return res.status(503).json({ error: 'Payments not configured' })
    let event
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], webhookSecret())
    } catch {
      return res.status(400).json({ error: 'Invalid signature' })
    }
    try {
      if ((event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded')
          && paidStatus(event.data.object)) {
        await fulfill(event.data.object)
      }
      res.json({ received: true }) // fast 2xx; email is fire-and-forget
    } catch (err) {
      console.error('[pay:webhook]', err.message)
      res.status(500).json({ error: 'Fulfillment failed' }) // Stripe retries
    }
  }]
}

/* --- JSON routes (mounted with the normal /api router) ------------------ */
const router = Router()

router.post('/pay/checkout', checkoutLimit, async (req, res, next) => {
  try {
    const stripe = stripeClient()
    if (!stripe) return res.status(503).json({ error: 'Payments are not live yet', dormant: true })
    const productKey = PRODUCTS[req.body?.product] ? req.body.product : 'app'
    const product = productOf(productKey)
    const priceId = product.priceId()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [priceId
        ? { price: priceId, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: product.cents(),
              product_data: { name: product.name, description: product.description },
            },
          }],
      metadata: { product: productKey },
      // {CHECKOUT_SESSION_ID} must stay literal - Stripe substitutes it.
      success_url: `${siteUrl()}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/pricing`,
    })
    res.json({ url: session.url })
  } catch (err) { next(err) }
})

router.get('/pay/order/:sessionId', orderLimit, async (req, res, next) => {
  try {
    const { sessionId } = req.params
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return res.status(400).json({ error: 'Bad session id' })
    const existing = await store.findOrderBySessionId(sessionId)
    if (existing) return res.json({ status: 'paid', code: existing.code, product: existing.product || 'app' })
    // Inline fallback for delayed/missed webhooks: ask Stripe directly and
    // fulfill through the same atomic claim.
    const stripe = stripeClient()
    if (!stripe) return res.status(503).json({ error: 'Payments are not live yet', dormant: true })
    const session = await stripe.checkout.sessions.retrieve(sessionId).catch(() => null)
    if (!session) return res.status(404).json({ error: 'Order not found' })
    if (!paidStatus(session)) return res.json({ status: session.payment_status || 'pending' })
    const order = await fulfill(session)
    res.json({ status: 'paid', code: order.code, product: order.product || 'app' })
  } catch (err) { next(err) }
})

export default router
