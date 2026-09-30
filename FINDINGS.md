# School Path GR1 — findings

Copyright stance: pedagogy shapes only. Words, echo lines, story text, and
picture hints are original eGeez content. No MoE PDF pages, no SIL art, and
no claim that the unit list is MoE page order. The free taste stays ሀ / ለ.
The MoE Alphabet book opens on በ / ሰ / ሸ.

## HAVE

- Alphabet School Path P0 (already merged): twelve units, Letter Steps,
  unit quizzes, four arcade gateways, Meet paintings for the families that
  already had gouache.
- Thickened `src/data/schoolPathGr1.json`:
  - A Meet `pictureWord` for every family, including the thin ones (sse
    painter, kha power, nye meow, zhe swing, ppe Pagume, ttse cup).
  - One or two high-frequency action `blendWords` per unit (gave, held,
    came, heard, saw, ate, sat, read, woke, went, opened, sang, took,
    slept, drank, ran, asked, played, washed, loved).
  - One or two original `echoLines` per unit, with English glosses.
  - `midLetterTargets` where a natural word hides the fidel mid-word or
    at the end (heart, sky, priest, scissors, holiday, bajaj, table, mouth).
  - Kids-book `pictureHint` / `artDirection` kept. English chrome stays
    eGeez / Jibby.
- Story Path pack `src/data/schoolPathGr1Stories.json`: ten original
  stories. The first five are Where Is Sam?, Walk to School, Coffee With
  Grandma, Baby Won't Sleep, and Sun All Week. The next five are Market
  Day (count-and-buy), The Rain Came (weather change), Helping at Home
  (chores), The Bajaj Ride (stops), and Moon and Stars (night-sky close).
  Each has an original Tigrinya title, an unlock unit, pages, and a
  refrain. Lines recycle Meet and blend words.
- Wiring: Tigrinya Story Time lists those ten books on the Story Path
  shelf. Each page paints a Meet-style scene from `public/art/stories`
  (the stamp scene is only the fallback). A story node sits on each
  School Path chapter. Biblical Amharic Story Time is unchanged. A
  separate Bible shelf (`መጽሓፍ ቅዱስ`) holds In the Beginning, Noah's
  Ark, Baby Moses, and Jonah. They are not mixed into these ten books.
  Creation stays the free taste. Noah waits on the ordinary band-1
  progress gate. Baby Moses waits on band 2, the next letter-family
  band. Jonah waits on band 3, the 24th family.
- Tests cover the new alphabet fields and the story schema. Docs:
  `docs/school-path.md`.
- Tigrinya line pass: Story Time lines are full kid sentences. Where Is Sam?
  asks `ሴም ኣበይ ኣሎ?`, then `ሴም ኣብ ክሽነ የለን።` and `ሴም ኣብ ቤት የለን።` The name
  is `ሴም` (se family) in every story line, title, and refrain. English
  glosses still say Sam. Grandma is `ዓባየይ` with `ሰተየት`. The walk bird is `ጭሩ`. Mom sings and
  holds with feminine verbs. The school walk says the child went and
  then arrived (`በጽሐ`). Each weekday is `ሰኑይ ጸሓይ ኣሎ።` and the same
  pattern for the other days. Spelling stays ኣ, not አ.

## Still NEED

- Word Build UI. `blendWords` and `blendWordsForLearned` are ready. Nothing
  on the path yet builds a word from tiles.
- Echo UI. `echoLines` are data only.
- Find-the-fidel quiz. `midLetterTargets` are data only. Unit quizzes are
  still listen-and-pick.
- Twin drills (vowel-family and look-alike pairs such as ሰ / ሠ and ጸ / ፀ).
- Meet gouache for sse, kha, nye, zhe, ppe, and ttse. Until those paintings
  exist, those Meet cards stay letter bubbles. Hints are in the JSON.
- Family Voice recordings for the new Meet words, echo lines, and the ten
  stories. Read-to-me falls back to letter spelling when no clip exists.
- Native-speaker pass on the rare-letter Meets (ኘው meow, ፅዋ cup,
  ኃይሊ power, ዥዋዥዌ swing, ጳጉሜ, ሠዓሊ). Story lines had a Tigrinya pass;
  a speaker can still flag a word that sounds off.
- No natural mid-word target for ttse (ፀ) or pe (ፐ) in this pack.
- Grade 2 and later harvests (mother tongue, maths, science) are not started.
- Geez Class (classical Geez slides) stays a separate future track.

---

# IAP findings — why live purchases do not show up

Audited 28 Sep 2026 against this repo (`@revenuecat/purchases-capacitor` 11.3.2). The owner report is that people are not purchasing in real time. That matches the code that ships today: a store build compiled from this repo cannot complete an in-app purchase, so RevenueCat and App Store Connect have nothing to show.

**Live purchases cannot appear in RevenueCat or App Store Connect from the build this repo produces today.** A new store build, with the keys below set at build time, plus the dashboard setup in `docs/store-purchases-iap.md`, is required before a real sale can exist. This change does not invent product ids and does not embed API keys (none are in the repo).

## What is wrong in code (fixed here)

1. **The paywall was compiled out even when a RevenueCat key was present.**
   `VITE_MONETIZE` defaults off (`.env` does not set it). `licenseState` in `src/platform/license.js` treated that as "fully licensed", so the after-trial ask never appeared. `src/GrownUps.jsx` treated Family Pack as free whenever `MONETIZE` was false (`unlocked || !MONETIZE`), so the Family Pack buy button never rendered. `docs/store-purchases-iap.md` told the owner that setting the two keys was enough to show the purchase sheet. It was not. A native build that had keys still never called `purchasePackage`, so RevenueCat recorded no transaction.
   Native builds with a key now run the same trial and show the purchase UI. Web/PWA stays free unless `VITE_MONETIZE` is set. A native build with no key stays free, because it still cannot sell.

2. **Grown-Ups "Buy the app" opened the store listing instead of StoreKit / Play Billing.**
   `src/GrownUps.jsx` used an `<a href>` to `buyUrl()` (the App Store page from `VITE_APPLE_APP_ID`, or `VITE_BUY_URL`). On a free app that link does not charge anyone and does not notify RevenueCat. The daily ask in `src/components/SupportAsk.jsx` already called `buyFullApp()`. Grown-Ups now buys and restores through RevenueCat when IAP is available. The website link remains the web path.

3. **A single-package offering bought the wrong product, then reported failure.**
   `pickPackage` in `src/platform/iap.js` fell back to the only package. The old runbook created only `family_pack`. Buy the app would purchase that package, see no `full_app` entitlement, and return `error`. The family could be charged and the app stayed locked. The fallback is gone. A missing product returns `unavailable` and does not call `purchasePackage`.

4. **No customer-info listener, and a stale purchase response was a hard error.**
   `initIap` read customer info once. Ask to Buy (a parent approves later — normal for a kids app) and a purchase whose entitlement is not on the immediate response never unlocked until a cold start, and the button said the store failed. `src/platform/iap.js` now registers `addCustomerInfoUpdateListener`, refreshes customer info when the purchase response has no entitlement, treats "already purchased" as a sync, and returns `pending` for Ask to Buy instead of `error`.

5. **Offerings were read only as `{ current }`.**
   The plugin source for 11.3.2 returns `{ current, all }` (confirmed in `purchases-hybrid-common` 17.25.0). An open report against this exact package (RevenueCat/purchases-capacitor#657, unreproduced by RevenueCat) says some runtimes wrap that as `{ offerings: { current } }`. Reading `.current` only then makes every buy `unavailable` and no transaction is sent. The app now accepts both shapes, and if nothing is marked Current but exactly one offering exists, it uses that offering.

6. **Purchase failures were swallowed.**
   Empty `catch` blocks hid a bad key, a missing plugin, and a store error. Failures now log `[iap] …` with the error code and message. The API key is not logged. A `test_` key logs a warning: those purchases never show as App Store or Play sales. Logging was not hiding transactions from the RevenueCat dashboard. The SDK was never configured, so there were no transactions to hide.

7. **Xcode Cloud builds `npm run build` with whatever `VITE_*` vars the workflow has.**
   `ios/App/ci_scripts/ci_post_clone.sh` does not set the keys. If the workflow env is empty, the archive ships with IAP off. The script now prints that when `VITE_REVENUECAT_APPLE_KEY` is unset. It does not print the key.

8. **Android billing permission is now declared on the app.**
   `android/app/src/main/AndroidManifest.xml`. The Play Billing library also merges `com.android.vending.BILLING`. The RevenueCat Capacitor plugin manifest itself is empty.

## What code does not do (still true, on purpose)

- **Web and PWA never run IAP.** `iapAvailable()` in `src/platform/storeEnv.js` requires Capacitor native plus a platform key. `isApplePlatform()` picks `appl_` vs `goog_`. iOS uses the Apple key; Android uses the Google key. A browser, including the installed PWA, skips the SDK. Those users are invisible in RevenueCat. Website sales go through Stripe (`api/routes/pay.js`) and email the owner via `notifyOwner` only after a paid Checkout session. That path is dormant without `STRIPE_SECRET_KEY` (the route returns 503).
- **There is still no owner push inside the app when a store purchase succeeds.** RevenueCat and the store consoles are the real-time view. The app does not email the owner on an IAP. Stripe does, once that API is live.
- **Sandbox is not a separate key in this code.** The same `appl_` / `goog_` key is sandbox and production. The store decides from the signed-in account. TestFlight, Xcode, and license-tester buys are sandbox. They show in RevenueCat only with the dashboard environment set to Sandbox. They do not show in App Store Connect / Play production sales.

## What must be fixed in App Store Connect, Play Console, and RevenueCat

None of this is in the repo. Code cannot complete it.

1. **App Store Connect**
   - Paid Applications agreement, banking, and tax must be active or StoreKit returns nothing.
   - The app must be **free** (the owner says it is). A paid-download price and an IAP are different reports. `APP-STORE.md` and `docs/store-listing.md` still describe a paid download with "no in-app purchases". That contradicts `src/platform/iap.js` and this free-plus-IAP setup. The listing, review notes, and IARC "purchases inside the app" answer have to match whichever model is actually shipping.
   - Two non-consumables, Cleared for Sale, submitted with a version:
     - `family_pack` — this id is the one written in the repo.
     - App unlock — entitlement checked is `full_app`. Any store product id that does not contain "family" is accepted. If a non-family product already exists, attach that one. Do not create a second. If nothing exists yet, product id `full_app` matches the entitlement.
   - In-App Purchase capability on the App target (Xcode Signing & Capabilities). It is not in the committed Xcode project.
   - App Store Connect In-App Purchase key uploaded to RevenueCat.

2. **Play Console**
   - Payments profile complete.
   - Both products created and **Active** (a draft cannot be bought). Same ids as Apple.
   - The build that sells must be on a testing track for license testers, and on production for real sales.
   - Service-account JSON with the read permissions RevenueCat asks for, uploaded to RevenueCat.

3. **RevenueCat**
   - Apple app bundle id `net.promisechain.fidelquest` and Play package `net.promisechain.fidelquest`.
   - Entitlements exactly `full_app` and `family_pack`, each attached to its product. A charge with no entitlement leaves the app locked (`src/platform/iap.js` `syncEntitlements`).
   - A **current** offering containing both packages.
   - Public SDK keys `appl_...` and `goog_...` set as `VITE_REVENUECAT_APPLE_KEY` and `VITE_REVENUECAT_GOOGLE_KEY` on the native build (`.env.local` or Xcode Cloud). Not committed. A `test_` key must not be the production key.
   - To see TestFlight / sandbox buys, switch the RevenueCat project to Sandbox. Production stays empty until a real store account buys the production binary.

## Can live purchases appear today?

No.

- The committed `.env` has `VITE_APPLE_APP_ID` and no RevenueCat keys and no `VITE_MONETIZE`.
- `Purchases.configure` never runs in that build. RevenueCat receives no events.
- The purchase buttons were not on screen, so StoreKit / Play Billing never ran. App Store Connect IAP sales stay at zero even if the products exist in the dashboard.
- Shipping a build that includes this fix **and** the `appl_` / `goog_` keys, after the products, entitlements, and current offering exist, is what makes the next real purchase show up. Until that binary is on the store, people using the current app still cannot buy.

## Ids already in the repo (nothing new was invented)

| Role | Id | Where |
| --- | --- | --- |
| App entitlement | `full_app` | `src/platform/iap.js` |
| Family Pack entitlement and store product id | `family_pack` | `src/platform/iap.js`, `docs/store-purchases-iap.md` |
| Apple public SDK key | `VITE_REVENUECAT_APPLE_KEY` | build env, not committed |
| Google public SDK key | `VITE_REVENUECAT_GOOGLE_KEY` | build env, not committed |
| Bundle / package | `net.promisechain.fidelquest` | `capacitor.config.json` |

There is no store product id string for the app unlock other than the entitlement `full_app`. The matcher treats every current-offering package whose product id does not contain "family" as that unlock.
