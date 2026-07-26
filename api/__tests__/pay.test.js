/* Payments tests - zero external services. Stripe is faked via
   createApp({ stripeClient }); webhook signatures are real HMACs built with
   the stripe SDK's generateTestHeaderString against a test secret.        */
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import Stripe from 'stripe'
import { createApp } from '../app.js'
import { store } from '../store.js'
import { _resetRateLimits } from '../middleware.js'
import { setStripeClient } from '../routes/pay.js'
import { mintFamilyCode, mintRandomCode, isValidFamilyCode, isValidAppCode, ALPHABET, CODE_PREFIX, APP_CODE_PREFIX } from '../familyCode.js'
// The anti-drift tripwires: the APP's own validators must accept our codes.
import { isValidFamilyCode as appIsValidFam } from '../../src/platform/familyPack.js'
import { isValidAppCode as appIsValidEgz } from '../../src/platform/appCodes.js'

const WH_SECRET = 'whsec_test_secret'
process.env.STRIPE_WEBHOOK_SECRET = WH_SECRET
process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
process.env.SITE_URL = 'https://egeez.example'

const paidSession = (id, email = 'buyer@example.com') => ({
  id, object: 'checkout.session', payment_status: 'paid',
  customer_details: { email }, metadata: { product: 'family_pack' },
})

function signedBody(session, type = 'checkout.session.completed') {
  const payload = JSON.stringify({ id: 'evt_1', type, data: { object: session } })
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: WH_SECRET })
  return { payload, header }
}

function fakeStripe(sessions = {}) {
  return {
    webhooks: new Stripe('sk_test_fake').webhooks, // real signature verification
    checkout: {
      sessions: {
        create: async (params) => ({ id: 'cs_test_new', url: 'https://checkout.stripe.com/test', ...params }),
        retrieve: async (id) => {
          if (!sessions[id]) throw new Error('No such session')
          return sessions[id]
        },
      },
    },
  }
}

beforeEach(() => { store._reset(); _resetRateLimits() })

test('FAM and EGZ codes: mint matches the app algorithms exactly', () => {
  assert.equal(mintFamilyCode('ABCD'), 'FAMABCD' + ALPHABET[(0 * 3 + 1 * 4 + 2 * 5 + 3 * 6) % 31])
  for (let i = 0; i < 200; i++) {
    const fam = mintRandomCode(CODE_PREFIX)
    assert.ok(isValidFamilyCode(fam), `api validator rejects ${fam}`)
    assert.ok(appIsValidFam(fam), `APP validator rejects ${fam} - algorithms drifted`)
    const egz = mintRandomCode(APP_CODE_PREFIX)
    assert.ok(isValidAppCode(egz), `api validator rejects ${egz}`)
    assert.ok(appIsValidEgz(egz), `APP validator rejects ${egz} - algorithms drifted`)
    assert.ok(!isValidFamilyCode(egz) && !isValidAppCode(fam), 'prefixes must not cross-validate')
  }
  assert.ok(!isValidFamilyCode('FAMABCA'))
})

test('checkout: product app is the default and prices at 1299', async () => {
  let captured = null
  const client = fakeStripe()
  client.checkout.sessions.create = async (params) => { captured = params; return { url: 'https://checkout.stripe.com/app' } }
  const app = createApp({ stripeClient: client })
  const res = await request(app).post('/api/pay/checkout').send({})
  assert.equal(res.status, 200)
  assert.equal(captured.metadata.product, 'app')
  assert.equal(captured.line_items[0].price_data.unit_amount, 1299)

  await request(app).post('/api/pay/checkout').send({ product: 'family_pack' })
  assert.equal(captured.metadata.product, 'family_pack')
  assert.equal(captured.line_items[0].price_data.unit_amount, 499)

  await request(app).post('/api/pay/checkout').send({ product: 'nonsense' })
  assert.equal(captured.metadata.product, 'app')
})

test('fulfillment mints the prefix matching the product', async () => {
  const appSession = { ...paidSession('cs_prod_app'), metadata: { product: 'app' } }
  const app = createApp({ stripeClient: fakeStripe({ cs_prod_app: appSession }) })
  const res = await request(app).get('/api/pay/order/cs_prod_app')
  assert.equal(res.body.product, 'app')
  assert.ok(res.body.code.startsWith('EGZ'), `expected EGZ code, got ${res.body.code}`)
  assert.ok(appIsValidEgz(res.body.code))
})

test('webhook: valid signature fulfills once; tampered signature rejected', async () => {
  const app = createApp({ stripeClient: fakeStripe() })
  const { payload, header } = signedBody(paidSession('cs_sig_1'))

  const bad = await request(app).post('/api/pay/webhook')
    .set('stripe-signature', header).set('content-type', 'application/json')
    .send(payload.replace('buyer@', 'evil@'))
  assert.equal(bad.status, 400)

  const ok = await request(app).post('/api/pay/webhook')
    .set('stripe-signature', header).set('content-type', 'application/json').send(payload)
  assert.equal(ok.status, 200)
  const order = await store.findOrderBySessionId('cs_sig_1')
  assert.ok(order && isValidFamilyCode(order.code))
  assert.equal(order.email, 'buyer@example.com')
})

test('webhook: duplicate delivery mints exactly one order/code', async () => {
  const app = createApp({ stripeClient: fakeStripe() })
  const { payload, header } = signedBody(paidSession('cs_dup_1'))
  const first = await request(app).post('/api/pay/webhook')
    .set('stripe-signature', header).set('content-type', 'application/json').send(payload)
  const codeA = (await store.findOrderBySessionId('cs_dup_1')).code
  const second = await request(app).post('/api/pay/webhook')
    .set('stripe-signature', header).set('content-type', 'application/json').send(payload)
  assert.equal(first.status, 200)
  assert.equal(second.status, 200)
  assert.equal((await store.findOrderBySessionId('cs_dup_1')).code, codeA)
})

test('webhook: unpaid session (async payment pending) does not fulfill', async () => {
  const app = createApp({ stripeClient: fakeStripe() })
  const pending = { ...paidSession('cs_unpaid'), payment_status: 'unpaid' }
  const { payload, header } = signedBody(pending)
  const res = await request(app).post('/api/pay/webhook')
    .set('stripe-signature', header).set('content-type', 'application/json').send(payload)
  assert.equal(res.status, 200)
  assert.equal(await store.findOrderBySessionId('cs_unpaid'), null)
})

test('order poll: inline fallback fulfills a paid session the webhook missed', async () => {
  const app = createApp({ stripeClient: fakeStripe({ cs_poll_1: paidSession('cs_poll_1') }) })
  const res = await request(app).get('/api/pay/order/cs_poll_1')
  assert.equal(res.status, 200)
  assert.equal(res.body.status, 'paid')
  assert.ok(isValidFamilyCode(res.body.code))
  // Poll again: same code (idempotent), no re-mint.
  const again = await request(app).get('/api/pay/order/cs_poll_1')
  assert.equal(again.body.code, res.body.code)
})

test('order poll: webhook-vs-poll race yields one code', async () => {
  const session = paidSession('cs_race_1')
  const app = createApp({ stripeClient: fakeStripe({ cs_race_1: session }) })
  const { payload, header } = signedBody(session)
  const [wh, poll] = await Promise.all([
    request(app).post('/api/pay/webhook')
      .set('stripe-signature', header).set('content-type', 'application/json').send(payload),
    request(app).get('/api/pay/order/cs_race_1'),
  ])
  assert.equal(wh.status, 200)
  assert.equal(poll.status, 200)
  const order = await store.findOrderBySessionId('cs_race_1')
  assert.equal(poll.body.code, order.code)
})

test('order poll: pending session reports status without minting', async () => {
  const app = createApp({ stripeClient: fakeStripe({ cs_pend: { ...paidSession('cs_pend'), payment_status: 'unpaid' } }) })
  const res = await request(app).get('/api/pay/order/cs_pend')
  assert.equal(res.body.status, 'unpaid')
  assert.equal(await store.findOrderBySessionId('cs_pend'), null)
})

test('checkout: creates a session with literal {CHECKOUT_SESSION_ID}', async () => {
  let captured = null
  const client = fakeStripe()
  client.checkout.sessions.create = async (params) => { captured = params; return { url: 'https://checkout.stripe.com/x' } }
  const app = createApp({ stripeClient: client })
  const res = await request(app).post('/api/pay/checkout').send({})
  assert.equal(res.status, 200)
  assert.equal(res.body.url, 'https://checkout.stripe.com/x')
  assert.equal(captured.mode, 'payment')
  assert.ok(captured.success_url.endsWith('session_id={CHECKOUT_SESSION_ID}'))
  assert.equal(captured.metadata.product, 'app')
})

test('dormant mode: 503s without Stripe config', async () => {
  const oldKey = process.env.STRIPE_SECRET_KEY
  const oldWh = process.env.STRIPE_WEBHOOK_SECRET
  delete process.env.STRIPE_SECRET_KEY
  delete process.env.STRIPE_WEBHOOK_SECRET
  setStripeClient(null)
  const app = createApp()
  try {
    assert.equal((await request(app).post('/api/pay/checkout').send({})).status, 503)
    assert.equal((await request(app).post('/api/pay/webhook')
      .set('content-type', 'application/json').send('{}')).status, 503)
    assert.equal((await request(app).get('/api/pay/order/cs_x')).status, 503)
  } finally {
    process.env.STRIPE_SECRET_KEY = oldKey
    process.env.STRIPE_WEBHOOK_SECRET = oldWh
  }
})

test('bad session id shape is rejected before touching Stripe', async () => {
  const app = createApp({ stripeClient: fakeStripe() })
  const res = await request(app).get('/api/pay/order/DROP%20TABLE')
  assert.equal(res.status, 400)
})
