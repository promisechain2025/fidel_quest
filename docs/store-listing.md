# Store listing pack — copy/paste content for both consoles

Everything App Store Connect and Play Console ask for, ready to paste.
Process steps live in APP-STORE.md; this file is the CONTENT.

## Identity

| | |
| --- | --- |
| App name | **eGeez** |
| Bundle / package id | `net.promisechain.fidelquest` |
| Category | Education (Apple: Kids > Education; Play: Education + Designed for Families) |
| Price | Paid up front: **$12.99** (Apple price point $12.99 / Play equivalent per country). Includes all paths, the Bible books and **1 kid profile**. **In-app purchases: extra kids profiles only** (non-consumable, bought in order): `profile_slot_2` $4.99, `profile_slot_3`..`profile_slot_6` $2.49 each, up to 6 children. No subscriptions, no ads. Setup: `docs/store-purchases-iap.md`. |
| Age band | Apple Kids Category: **6–8** (also fits 5 and under). Play target audience: **5 & under + 6–8** (mixed audience). |
| Version | 1.3.1 (Android versionCode 8, iOS build 8) |

## Apple App Store (English)

- **Name (30 chars):** `eGeez`
- **Subtitle (30 chars):** `Learn the Ethiopian alphabet`
- **Promotional text (170):**
  `Anbessa the lion cub teaches kids all 231 fidel letters with real human
  voice - games, stories and rewards. Works fully offline. No ads, no
  accounts, no tracking.`
- **Keywords (100 chars, comma-separated):**
  `amharic,tigrinya,fidel,ethiopian,eritrean,alphabet,geez,kids,learn,abugida,ኣማርኛ,ፊደል`
- **Description:**

```
eGeez turns learning the Ethiopian alphabet into an adventure.

Anbessa the lion cub guides children along a journey through all 33
letter families and 231 letters of the fidel - the script used by
Amharic and Tigrinya. Every letter is voiced by a real human recording.

FOR KIDS
- A winding journey with exactly one next step - no menus to get lost in
- Six mini-games per letter family: pop bubbles, trace letters, feed
  Anbessa, outsmart Jibby the hyena
- 3D adventures: Letter Runner across Lalibela, Aksum, the Simien
  mountains and Gondar, and Fidel Skylands floating islands
- A Daily Letter Hunt, streaks, and a treasure gift every day
- Dress Anbessa in hats, scarves and capes earned by learning

FOR FAMILIES
- Family Voice: a grandparent anywhere in the world can record the
  letters in their own voice for your child
- Voice postcards and share cards to celebrate milestones
- The whole app works offline after the first download - perfect for
  travel and for keeping kids off the internet
- App text in English, Amharic, Tigrinya, German, French, Italian,
  Dutch, Swedish and Norwegian

FOR PARENTS AND TEACHERS
- A parents dashboard (behind a grown-up gate) with letter mastery,
  trouble letters and practice tips
- A full teacher mode: term plans, homework links over WhatsApp, a TV
  chant board for the classroom - no accounts needed

ONE PRICE FOR THE WHOLE JOURNEY
- Every path and every Bible book, unlocked from the first launch, with
  1 kid profile. No subscriptions, no ads.
- More children on the same device? Extra kids profiles are optional
  in-app purchases: $4.99 for a 2nd child, $2.49 for each child after,
  up to 6. Bought by a grown-up behind the parental gate.

PRIVACY FIRST
- No ads. No accounts. No data collection. Everything stays on the
  device. The only things that ever leave it are the cards and files a
  grown-up explicitly shares.
```

- **App Privacy (nutrition label):** Data Not Collected. (True for the
  store build: no analytics env vars set, no accounts, no tracking.)
- **Age rating questionnaire:** no violence, no scary content, no
  gambling, no unrestricted web access, no user-generated content
  exchange (sharing is OS share sheet initiated by the user), no
  contests. Made for Kids: yes.
- **Review notes (paste into App Review Information):**

```
eGeez is a fully offline children's education app. No account or
login exists. Notes for review:

1. PARENTAL GATE: adult areas (Parents dashboard, purchases links,
   sharing) sit behind a gate: press and HOLD the button for 2 seconds,
   then tap the digits matching the written number word (e.g.
   "thirty-five" -> 35).
2. The Backpack (bag icon, top right) contains all secondary modes.
   Teacher mode is designed for classroom use via shared links; it
   needs no server or account.
3. The microphone is used ONLY if the optional Family Voice recorder is
   included in this build; recording is an adult flow behind the gate,
   audio stays on-device and is only exported as a file the adult
   explicitly shares. (If this build ships with the recorder disabled,
   no microphone permission is requested at all.)
4. The app is paid up front. The ONLY in-app purchases are extra kids
   profiles (non-consumable, bought in order: profile_slot_2, then
   profile_slot_3..6). To see them: tap the player name / "+" on the
   "Who is playing?" screen, or Grown-Ups (gate) -> Children ->
   "Unlock profile 2". The child-facing screen shows no price; the buy
   card and "Restore purchases" are only shown after the parental gate.
   No subscriptions, no ads.
```

## Google Play (English)

- **Title (30):** `eGeez`
- **Short description (80):**
  `Learn the Ethiopian alphabet with games and real voice. Offline, no ads.`
- **Full description:** same as the Apple description above.
- **Tags:** Education, Kids
- **Target audience and content:** ages 5-under and 6-8; appeals to
  children. Join **Designed for Families**. Apply for **Teacher
  Approved** after launch (uses the teacher mode as evidence).
- **Data safety form:** No data collected. No data shared. Data is not
  encrypted in transit (nothing is transmitted). Users cannot request
  deletion (nothing exists to delete). Committed to Families policy.
- **IARC content rating questionnaire:** no violence, no sexuality, no
  language, no controlled substances, no gambling; no user interaction
  features (no chat, no data sharing between users inside the app); no
  location sharing; in-app purchases: yes (extra kids profiles, behind a
  parental gate, via Google Play Billing).
- **Ads declaration:** contains no ads.

## Amharic listing (Play supports am; use for the Ethiopian storefront)

- **Title:** `ፊደል ኩዌስት`
- **Short description (80):**
  `ፊደልን በጨዋታና በእውነተኛ ድምፅ ይማሩ። ያለ በይነመረብ ይሰራል፣ ማስታወቂያ የለም።`
- **Full description:**

```
ፊደል ኩዌስት ፊደል መማርን ወደ ጀብዱ ይለውጠዋል።

የአንበሳ ግልገሉ አንበሳ ልጆችን በሁሉም 33 የፊደል ቤተሰቦችና 231 ፊደላት ጉዞ
ይመራቸዋል። እያንዳንዱ ፊደል በእውነተኛ የሰው ድምፅ ይነገራል።

ለልጆች
- አንድ ቀጣይ እርምጃ ብቻ ያለው ግልጽ ጉዞ
- በየፊደል ቤተሰቡ ስድስት ጨዋታዎች፦ አረፋ ማፈንዳት፣ ፊደል መሳል፣ አንበሳን
  መመገብ፣ ጅቢን ማሸነፍ
- የ3D ጀብዱዎች በላሊበላ፣ በአክሱም፣ በስሜን ተራሮችና በጎንደር
- የየቀኑ የፊደል አደን፣ ተከታታይነትና የቀን ስጦታ

ለቤተሰብ
- የቤተሰብ ድምፅ፦ አያት ከየትም ሆነው ፊደላቱን በራሳቸው ድምፅ ቀርጸው
  ለልጅዎ መላክ ይችላሉ
- መተግበሪያው ከመጀመሪያው ውርድ በኋላ ሙሉ በሙሉ ያለ በይነመረብ ይሰራል

ለወላጆችና ለመምህራን
- የወላጆች ዳሽቦርድ ከትልቅ ሰው በር ጀርባ
- ሙሉ የመምህር ሁነታ፦ የተርም እቅድ፣ በዋትስአፕ የቤት ስራ ማገናኛዎች፣
  ለክፍል የቲቪ የዜማ ሰሌዳ - መለያ አያስፈልግም

ግላዊነት መጀመሪያ
- ማስታወቂያ የለም። መለያ የለም። ምንም መረጃ አይሰበሰብም።
```

## Screenshots (shot list)

Take on a phone with `?unlock` (confirm the dialog), language set per
storefront. Required sizes: iPhone 6.9" and 6.5" (Apple), phone + 7" +
10" tablet (Play). Suggested eight shots, in order:

1. Home journey path with Anbessa header and Today's plan
2. A letter step mid-game (Bubble Pop with a big letter)
3. Trace-to-carve with a finger stroke visible
4. Letter Runner (3D) with the three letter gates ahead
5. Fidel Skylands island map
6. Anbessa's Closet, dressed up
7. Daily Letter Hunt meadow
8. Parents dashboard (mastery grid) - caption "For grown-ups"

Caption each shot in the storefront language (Play allows per-language
graphics; reuse the English set for the small locales).

## After the listings exist

1. Keep the Apple numeric app id in `VITE_APPLE_APP_ID` (`.env`) so iOS
   share cards link to the store page.
2. Point the website's store buttons at the live listings
   (`VITE_APP_STORE_URL` / `VITE_PLAY_STORE_URL`, defaults in
   `website/src/config.js`).
3. Create the five extra-profile products in App Store Connect (attach
   them to the version) and Play Console (Active): `profile_slot_2` $4.99,
   `profile_slot_3`..`profile_slot_6` $2.49 each. Keep the 1.2
   `family_pack` removed from sale / inactive. The stores are the only
   place eGeez or its add-ons are sold.
