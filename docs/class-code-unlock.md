# Teacher class-code unlock for easygeez.com/app

**Why:** Android families who don't have the 1.3.1 website unlock code can still
use the full web app when their teacher's class gives them access.

**How it works**
* **Teacher Mode** (behind the parental gate or class key) has an **Unlock the
  web app for this class** card.
  * Pick 30, 90 or 180 days, then **Make unlock code**. The result is
    `EGC-<TAG>-<EXP><GEN><SIG>`.
  * The code is saved with the class in `fq.teacher.v1` and rides in the class
    invite link (`#class=` token field `u`).
* **Student:** opening the invite and tapping Join redeems the code. A green
  open-lock icon confirms it, with no English. The browser gets full `/app`
  access until the code expires (`fq.classUnlock.v1`, a device key).
* **Grown-up:** the code can also be typed in the trial screen's unlock field,
  next to the existing EGZ codes and behind the same gate.

**Abuse limits**
* **Per class:** TAG is a 6-character hash of the class code, so a code works
  for one class only.
* **Signed:** an HMAC-SHA256 over the tag, expiry and generation. Editing any
  of them breaks the signature, including pushing the expiry later.
* **Expires:** 180 days at most, enforced on mint and on verify. Access ends at
  expiry on every device, and the class needs a fresh code to continue.
* **Rotation:** **Make a new code** bumps the generation and replaces the code
  in the invite link. A device that already holds a newer generation ignores an
  older shared code.
* **Revocation (later, with class sync):** call
  `applyClassUnlockPolicy({ code, minGen, revoked })` from the sync response
  and access from older generations stops. Until then, rotating cannot switch
  off codes already redeemed; only expiry does.
* **Honest limit:** this has no server. As with the EGZ codes, the key ships in
  the app, so it stops casual sharing, not a determined reverse-engineer.

**Tests:** `src/platform/classUnlock.test.js` covers mint and verify, forged,
edited and expired codes, the 180-day cap, full access on the web trial,
rotation and revocation, and the round trip through the invite link.
