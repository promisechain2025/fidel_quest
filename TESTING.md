# Testing checklist — things to verify on a real device

Most of this can't be exercised in CI/headless (3D, microphone, cross-device
transfer, native notifications), so here's a running list to check by hand.
Tip: append **`?unlock`** to the URL to open all content, **`?reset`** to wipe
back to a new player.

## 3D games (need a real GPU/device)
- [ ] **Runner** — Anbessa and Jibby now face **forward** (toward the letters),
      leaning toward the lane being steered to. Confirm they no longer look
      sideways/right.
- [ ] **Runner** — as mistakes pile up, the extra Jibbys close in.
- [ ] **Skylands** — tap fruits in the learning phase; the count fills and the
      **Start** button enables (this was the "can't progress" bug — now uses
      onPointerDown). Then the quiz and boss advance on tap.
- [ ] Low-end device: the 2D fallback (Runner2D / Skylands2D) still plays.

## Family Voice (needs two devices, ideally one iOS + one Android)
- [ ] Record a voice (Backpack → Family Voice → Record, behind the grown-up
      gate). Tap letters to record, tap a recorded one to hear it back.
- [ ] **Share** the `.fidelvoice` file over WhatsApp/AirDrop to the other phone.
- [ ] On the second phone: **Import a voice**, choose it — Anbessa should speak
      in that voice for the base letters.
- [ ] **Cross-codec:** record on Android, play on iOS **and** the reverse (the
      WAV normalization is meant to make this work — this is the key thing to
      confirm).
- [ ] Kids build with `VITE_FAMILY_VOICE_RECORD=false`: the recorder is gone,
      import + playback still work, no mic permission is requested.

## Retention
- [ ] **Daily Letter Hunt** — the blue banner under the home header pulses
      until played. Jibby hides 5 of the child's letters behind bushes/rocks;
      Kokeb calls a sound; tapping the right letter pops it out (tapping the
      bush counts too — big hit target). A wrong tap ducks the letter and
      Jibby smirks; the same call repeats. Finishing shows "Open the treasure"
      (the daily gift) and the banner flips to "Done today". Next calendar day:
      a brand-new hunt (new letters, new hiding spots).
- [ ] **Hunt uses the child's letters** — with "My letters" scope it only hides
      learned families (first family for a brand-new player); "All letters"
      widens it. Wrong answers feed Star Practice's trouble list.
- [ ] **Streak** — a flame + number shows in the home header. Open the app on
      two consecutive days: the count goes up. Skip a day: it resets to 1 (best
      is kept).
- [ ] **Daily reminder** (native only) — Grown-ups → Daily reminder toggle asks
      for notification permission, then a reminder fires ~5pm. Toggling off
      cancels it; it re-arms after an app restart if left on.

## Share cards (viral loop)
- [ ] **Milestone card** — finish a chapter: the celebration's **Share** card shows
      "<child's name> learned N letters!" when a nickname is set (Grown-ups →
      nickname), and the plain ፊደል wordmark when it isn't.
- [ ] **Write your name** (Backpack → **My Name**) — pick a vowel sound, tap
      letters to spell a name in Fidel (each tap voices the syllable). Backspace /
      clear / hear-the-name work. **Share my name** renders a card with the name
      big in Ge'ez + Anbessa, to the share sheet (PNG download fallback on web).

## Family connection
- [ ] **Voice Postcard** (Backpack → Postcard) — record a short message (20s
      cap), listen back, re-record. "Send to family" goes through the grown-up
      gate, then shares a postcard image + the voice as a WAV to the share
      sheet (on the web it downloads both). Check WhatsApp receives picture +
      playable voice note; test a recording made on iOS plays on Android and
      the reverse.
- [ ] Kids build with `VITE_FAMILY_VOICE_RECORD=false`: the Postcard screen
      shows the friendly no-recording note instead of the mic button.

## Ethiopian calendar
- [ ] The home screen shows today's **Ethiopic date** (Ge'ez + latin) under
      the header — verify it matches a known calendar converter.
- [ ] On a holiday (set the phone date to Sept 11 = Enkutatash to simulate)
      the strip becomes the **እንኳን አደረሳችሁ! banner**, and the Daily Hunt
      meadow is dressed (adey abeba daisies for Enkutatash/Meskel, stars for
      Genna, drops for Timkat, pennants for Adwa / Eritrean Independence Day).

## Community / affiliate
- [ ] Grown-ups → **Community code** — enter a code, it saves and shows
      "supporting <CODE>"; Change clears it. (With `VITE_ANALYTICS_URL` set, a
      `community:<CODE>` event is reported.)

## Teacher Mode (link + receipt, no server)
- [ ] Grown-ups → **Teacher tools** — create a class (name + code). The
      Invite card shows a **QR code** and a share-link button.
- [ ] On a second device (or private window), open the invite link — a
      **"Join {teacher}'s class?"** screen appears; joining stores the class
      and sets the community code, and needs no account.
- [ ] Teacher: build an **assignment** (pick families on the letter grid,
      question count, due date) and share the link over WhatsApp to the
      student device.
- [ ] Student: the link opens an assignment intro (teacher, count, due date).
      Choosing **Later** puts a "Teacher's assignment" row into the home
      **Today's plan** card; it opens the same assignment.
- [ ] Finish the assignment — same questions for every student who opens the
      same link. The done screen asks for the child's name and **Send result
      to teacher** shares a result link (no server involved).
- [ ] Teacher: open the received result link — a green **"Result saved"**
      banner and the student appears in the **Results** roster (best %, one
      line per assignment). Opening the same link twice does not
      double-count; a retake replaces the score.
- [ ] Teacher tools → **Open TV display** — full-screen dark chant board:
      giant letter, the family's 7 orders, auto-advance with audio,
      arrow-keys/remote and taps drive it, join-QR in the corner, Escape or X
      exits. Cast/plug into a TV and check it reads across the room.

## Learning flow polish
- [ ] **Feed Anbessa** (Echo/Shuffle) — tapping a wrong letter flashes it RED
      and **re-voices the asked letter** (not the tapped one). Anbessa still
      swats.
- [ ] **Bubble Pop** — the popped bubble fades out while it's voiced, then the
      next letter comes in (no overlap).
- [ ] **Star Trail** — stars sit in a roomy zigzag on a phone (not crowded).
- [ ] **Scope toggle** — "My letters / All letters" in each game menu and the
      Backpack restricts the letters to those learned (new player falls back to
      the first family).

## Language
- [ ] Switch **App text** (Backpack) through English / Amharic / Tigrinya /
      the European languages — the whole app now follows in **every** language,
      including Grown-ups, Explorer (incl. the Slow/Normal/Fast speed pills),
      Write-your-name, Family Voice, the **Classic** game, and Skylands/Runner
      HUD. There should be no English left when a non-English language is set.
- [ ] **Native review of the auto-translations** — the six European packs
      (`de/it/sv/nl/no/fr`) in `src/platform/langpacks.js` and their new blocks
      in `src/data/fidelGameData.js` (`UI_STRINGS`), plus the `ti` strings, are
      best-effort and machine-assisted. A native pass on each language to fix
      anything that reads oddly is still worth doing before store launch. The
      `-a / -u / Ge'ez / Ka'ib` order labels are romanized transliterations
      (data), intentionally left untranslated.

## Store readiness (once paid)
- [ ] **Gift** (Apple) — Backpack → Gift walks through Apple's "Gift App";
      needs `VITE_APPLE_APP_ID` set and the app published. See `APP-STORE.md`.
- [ ] Build the store version with the optional URLs unset and the mic decision
      made (`VITE_FAMILY_VOICE_RECORD`) — see `APP-STORE.md` checklist.
