# Shipping eGeez to the App Store & Google Play

eGeez runs as a native app through **Capacitor** — the same web build
(`dist/`) wrapped in a thin Android/iOS shell. This repo already contains
everything that can be prepared on any machine; the actual **builds and
submissions must happen on a Mac** (iOS needs Xcode; both need the store
accounts). This guide is the end-to-end runbook.

---

## Before you submit — quick checklist

- [ ] **Monetization:** leave **`VITE_MONETIZE` unset** to ship the app **FREE**
      (no trial, no paywall, no Buy/Family-Pack/Gift UI, no RevenueCat/IAP — the
      cleanest kids-review build, and "Data Not Collected" stays true). Set
      `VITE_MONETIZE=true` **only** when the purchase is ready — that turns on
      the free-download → trial → in-app-purchase flow (on web **and** native)
      and then you must configure the IAP + declare purchase data. See §7 and
      `docs/store-review-compliance.md`.
- [ ] Build the store release with **no optional server env vars** set
      (`VITE_ANALYTICS_URL`, `VITE_SOCIAL_URL`, `VITE_SHOP_URL`) so the app
      provably collects nothing — see §5.
- [ ] Once the App Store listing exists, set **`VITE_APPLE_APP_ID`** (the
      numeric id from App Store Connect) at build time so the in-app
      **"Send this app as a gift"** button links to your store page — see §7b.
      Without it the gift guide still shows but the button stays disabled.
- [ ] Set **`VITE_APP_URL`** (the canonical landing you want shares to point
      at — the web app URL or a store smart link). Every share (Anbessa card,
      name card, voice postcard) appends this link so recipients can find the
      app. Unset, web builds fall back to their own origin and native builds
      to the App Store page from `VITE_APPLE_APP_ID`.
- [ ] Bump the version (iOS Build number / Android `versionCode`) — §4.
- [ ] Host the **privacy policy** and paste its URL into both stores **and set
      `VITE_PRIVACY_URL`** to it, so the in-app "Privacy policy" link (in the
      gated Grown-Ups area) points at the real page — required by Apple 5.1.1(i).
      Unset, the link falls back to `VITE_APP_URL`. See §8 and
      `docs/store-review-compliance.md`.
- [ ] Microphone: the only mic use is the optional **Family Voice** recorder
      (adult flow). For the simplest kids review build with
      **`VITE_FAMILY_VOICE_RECORD=false`** (no mic); or keep it and declare the
      permission — see §4.

---

## 0. What's already done in the repo

- `capacitor.config.json` — app id `net.promisechain.fidelquest`, name
  **eGeez**, splash + status-bar config.
- Plugins installed: `@capacitor/android`, `@capacitor/ios`, `splash-screen`,
  `status-bar`, `share`, `app`, `filesystem`.
- `src/platform/native.js` — native bridge (status bar, splash hide, Android
  hardware **back button**, native **share sheet**). No-op on the web.
- Sharing (challenge links + the Anbessa card) uses the **OS share sheet** when
  packaged; the card image is written to cache and shared as a file.
- Safe-area padding on the top bar; the "Review this app" web link is **hidden
  in the native build** (kids-category compliance).
- `resources/icon.png` (1024) + `resources/splash.png` (2732) source art for
  icon/splash generation.

The app is **offline-first** (~6 MB, self-hosted fonts + audio), so it works
with no network after install.

---

## 1. Prerequisites (one time)

**Machine (Mac required for iOS):**
- macOS + **Xcode** (latest) + Command Line Tools, and **CocoaPods**
  (`sudo gem install cocoapods`).
- **Android Studio** + **JDK 17** (Android Studio bundles one).
- Node 20+ and this repo cloned.

**Accounts:**
- **Apple Developer Program** — $99/year (developer.apple.com).
- **Google Play Console** — $25 one-time (play.google.com/console).
- A **privacy policy URL** (required for both, and mandatory for kids apps —
  see §7). A template is in §8.

---

## 2. Native platforms - ALREADY IN THE REPO

`android/` and `ios/` are generated and committed, with app icons, splash
screens and the adaptive-icon background already baked in (from
`resources/`), and versions set to 1.0.0 / versionCode 1. On your Mac:

```bash
npm install
cd ios/App && pod install && cd ../..   # one time, iOS only
npm run sync:native                     # = vite build && cap sync
```

Re-run `npm run sync:native` after **any** web change to push it into the
native shells.

---

## 3. Icons & splash screens - ALREADY BAKED

All launcher icons (including Android adaptive + round), splash screens
(all densities, portrait + landscape) and the iOS 1024 icon are committed
in the native projects, rendered from `resources/icon.png` and
`resources/splash.png`. To change the art later, replace those two masters
and regenerate on your Mac:

```bash
npm i -D @capacitor/assets
npx @capacitor/assets generate \
  --iconBackgroundColor '#fffbeb' --iconBackgroundColorDark '#fffbeb' \
  --splashBackgroundColor '#fffbeb' --splashBackgroundColorDark '#fffbeb'
npx cap sync
```

---

## 4. Native permissions & settings

### Microphone — only the optional Family Voice recorder
The old "Say-it" practice was removed. The **one** remaining mic use is the
**Family Voice** recorder (`docs/family-voice.md`): a *grown-up* records the
letters in their own voice on-device to share with a child. Importing and
playing a received voice never uses the mic.

You have two store options:

- **Simplest kids review (no mic):** build with
  **`VITE_FAMILY_VOICE_RECORD=false`**. The recorder UI is removed entirely;
  only import + playback ship, so the app declares **no microphone** and no
  data collection. Families can still receive and use voices — just record on a
  device where the recorder is enabled (e.g. the web app).
- **Keep the recorder:** leave it on and declare the permission with an
  adult-facing description:
  - **iOS** — `ios/App/App/Info.plist`:
    ```xml
    <key>NSMicrophoneUsageDescription</key>
    <string>eGeez lets a grown-up record the letters in their own voice on this device to share with a child. Audio stays on the device and is only sent in a file you choose to share.</string>
    ```
  - **Android** — `android/app/src/main/AndroidManifest.xml`:
    ```xml
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-feature android:name="android.hardware.microphone" android:required="false" />
    ```
  Data-safety: audio is created on-device and **not collected/uploaded** — it
  only leaves the device inside a file the user explicitly shares.

### App name / version
- **iOS**: Xcode → target **App** → General → Display Name, Version (e.g.
  `1.0.0`), Build (`1`). Signing → your Team.
- **Android**: `android/app/build.gradle` → `versionCode` (integer, bump every
  upload) and `versionName` ("1.0.0").

---

## 5. Build a store-safe (zero-data) release

The app collects nothing by default. **Build the store version with none of the
optional server env vars set**, so there is provably no data collection or
external link (important for kids category):

```bash
# NO VITE_ANALYTICS_URL, NO VITE_SOCIAL_URL, NO VITE_SHOP_URL
npm run build && npx cap sync
```

With those unset: analytics send nothing, Family & Friends is hidden, and the
Tee Shop "Order" button falls back to saving a picture (no external store link).

---

## 6. Build, test, and upload

### Android (Google Play)
```bash
npx cap open android          # opens Android Studio
```
1. Run on a device/emulator to smoke-test.
2. **Build → Generate Signed App Bundle / APK → Android App Bundle (.aab)**.
3. Create an **upload keystore** the first time and **back it up safely** —
   losing it means you can't update the app. (Enroll in Play App Signing.)
4. In **Play Console**: create the app → **Internal testing** → upload the
   `.aab` → add testers → verify on real devices → promote to Production.

### iOS (App Store)
```bash
npx cap open ios              # opens Xcode
```
1. Select a Team under Signing & Capabilities; run on a simulator/device.
2. **Product → Archive** → **Distribute App → App Store Connect → Upload**.
3. In **App Store Connect**: create the app record (same bundle id
   `net.promisechain.fidelquest`), attach the build, fill metadata, use
   **TestFlight** to test, then **Submit for Review**.

---

## 7. Store listings & kids compliance

This is a **children's education** app, so both stores route it through their
kids/families programs — plan for it.

**Both stores need:**
- Title, short + full description, category (**Education**), screenshots
  (phone + tablet; iOS also wants a few sizes), and the **privacy policy URL**.
- **Content rating**: Google uses the IARC questionnaire; Apple sets an age
  band. Answer honestly — no violence, no ads, no data collection.

**Google Play — "Designed for Families" / Teacher Approved:**
- **Target audience**: include the child age bands.
- **Data safety** form: declare **no data collected/shared** (true for the
  store build in §5).
- Meets Families Policy: no ads (true), no external links without a gate (the
  Review link is already hidden in-app; keep `VITE_SHOP_URL` unset).

**Apple — Kids Category:**
- Choose the **Kids** category + age band (e.g. 5 and under / 6–8).
- Kids apps **may not** send personal data, show third-party ads, or link out
  of the app without a **parental gate**. eGeez's "For grown-ups" hold-
  and-answer gate qualifies; keep external links (shop) behind it or unset.
- **App Privacy** ("nutrition label"): declare **Data Not Collected** for the
  §5 build.

---

## 7b. Gifting & recommending the app

There is an in-app **"Send this app as a gift"** entry (Backpack → **Gift**,
shown only on Apple devices). It doesn't take payment itself — it walks a
grown-up through Apple's own **Gift App** flow and opens the App Store page.

**Apple — the built-in Gift App flow (works once the app is paid):**
- On the app's App Store page, the parent taps the share **(...)** button →
  **Gift App**, pays, and sends it by email. The recipient **redeems it once**
  and the gift code is then spent — exactly "send it, download once, expires".
- Only works for **paid** apps, gifter/recipient in the **same country**, and
  you can gift the **app** but not in-app purchases/subscriptions.
- To make the in-app **Open App Store** button live, set the App Store numeric
  id at build time once the listing exists:
  ```bash
  VITE_APPLE_APP_ID=1234567890 npm run build && npx cap sync
  ```
  Until it's set, the gift guide still shows but the button is disabled
  ("Available once eGeez is on the App Store") — no dead link.

**Google Play — no per-app gifting.** Play has no equivalent button, so the
Gift entry is hidden on Android. The two options there are Play **gift-card
balance** (indirect) or developer **promo codes** (Play Console → *Promotions*;
single-use codes you generate, up to 500/app/quarter, redeemed once then spent).

**Recommending (free, either store):** anyone can share the App Store / Play
listing link — no gifting mechanics needed.

> A custom "paid link" outside the stores that unlocks the native download
> yourself is **not** allowed — app payment must flow through Apple/Google.

## 8. Privacy policy (required)

Host something like this at a public URL and link it in both stores:

> **eGeez — Privacy Policy.** eGeez is an offline alphabet-learning
> game for children. It does **not** collect, store, or share any personal
> information. All progress and settings stay on the device. There are no
> accounts, no ads, and no third-party trackers. If this build includes the
> optional Family Voice recorder, recordings are made by an adult, stay on
> the device, and leave it only inside a file that adult explicitly chooses
> to share. Optional features that would send data (anonymous usage counts,
> Family & Friends leaderboards) are turned off in the published app.
> Contact: promisechain.net@gmail.com.

Adjust if you later enable analytics or Family & Friends in a build.

Host it at a public URL, paste that URL into **both store consoles**, and set
**`VITE_PRIVACY_URL`** at build time so the in-app **Privacy policy** link (in
the gated Grown-Ups area) opens it — Apple 5.1.1(i) requires the policy to be
reachable inside the app, not only in store metadata. If unset, the in-app link
falls back to `VITE_APP_URL`.

---

## 9. Updating the app later

```bash
git pull
npm run build && npx cap sync
# bump Android versionCode / iOS Build number, then re-archive/upload
```

Native shell changes (plugins, permissions) need a new store build; **web-only**
changes could also ship instantly to the PWA at your web URL if you keep that
running alongside the stores.

---

## 10. Listing content

Every piece of text and every answer both consoles ask for - names,
descriptions (English + Amharic), keywords, age-rating questionnaire
answers, data-safety declarations, reviewer notes (including how to pass
the parental gate), the screenshot shot list, and the suggested price -
is ready to paste from **`docs/store-listing.md`**.

## Quick reference

| Task | Command |
| --- | --- |
| Sync web → native | `npm run build && npx cap sync` |
| Open Android Studio | `npx cap open android` |
| Open Xcode | `npx cap open ios` |
| Regenerate icons/splash | `npx @capacitor/assets generate …` (§3) |
