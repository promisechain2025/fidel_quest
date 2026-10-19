# eGeez prayer pages: reading-mark audit, doubt list (19 Oct 2026, EAT)

Branch `fix/prayer-title-compact-marks`. **Update 19 Oct (EAT):** Yosief answered A1–A8 (all in ጸሎት ዘዘወትር), and his answers have been applied. Three marks changed (#254, #274, #326), and #419+#420 were joined. The other items still need his ear.

## How the marks were made (from the repo)
- The marks come from the awdemehret.org reading tags (`reading.php?bid=wmg&cid=<day>`), where ተ = ተነሽ, ቂ = ወዳቂ, ጣ = ተጣይ, ፍ = ስያፍ-ተነሽ and `-` = ተናባቢ. They were **not** taken from the recordings. The recordings were used only for the word clips (forced alignment).
- Yosief's own corrections are commit `0215de8`: ጸሎት #200 ብእሴ → ወዳቂ; ወኢምንትኒ / ዘበሰማይኒ / ወዘበምድርኒ → ወዳቂ; the ወነበረ / በየማነ‿አቡሁ split; መጽሕፍት. ውዳሴ ሰኑይ is marked "fully confirmed" by him.
- The hard rule from commit `d081246`, enforced by tests on all 8 books, is ሰያፍ ⇔ the last letter is ሳድስ, otherwise ተነሽ. Because of that rule, a source ተ on a word ending in ሳድስ is shown as ሰያፍ, and a source ፍ on a word that doesn't end in ሳድስ is shown as ተነሽ.
- Where the mark sits (`li`): ተነሽ, ሰያፍ and ተጣይ go on the second-to-last letter and ወዳቂ on the last. All 2,849 units follow this.
- Tigrinya legend: ተነሽ = ተለዓሊ, ተጣይ = ተዋሓጢ, and the other names stay as in Amharic. This is in `markNames('ti')` and tested.

## Rule check
- ሰያፍ / ሳድስ: 0 violations in all 8 books (ጸሎት ዘዘወትር and ውዳሴ ማርያም ሰኑይ through እሁድ).
- Mark placement: 0 violations.
- Tigrinya names: correct.
- **So there were 0 clear rule violations to fix.** Everything below is a doubt: the app disagrees with the source, the source text is broken, or the same word is marked differently in different places.

## A. Possibly missed ተጣይ (source says ጣ, the app shows something else, and Yosief hasn't reviewed it)
| # | Prayer | Section / unit (at audit) | Word (context) | App at audit | Suspected | Why | Resolution |
|---|---|---|---|---|---|---|---|
| A1 | ጸሎት ዘዘወትር (ጸሎተ ሃይማኖት) | §6 / #254 | **ትንሣኤ** (ወንሴፎ ትንሣኤ ሙታን) | ተነሽ | ተጣይ | Source ጣ. The first build had ሰያፍ by mistake, and the ሳድስ rule then flipped it to ተነሽ automatically. Nobody chose ተነሽ. | **RESOLVED 19 Oct (Yosief): ወዳቂ** (mark on the last letter). |
| A2 | ጸሎት ዘዘወትር | §7 / #274 | **ሰማያዊ** (ኄር ሰማያዊ ወመንፈስከ ቅዱስ) | ተነሽ | ተጣይ | Same as A1: source ጣ, wrong ሰያፍ at first, then flipped to ተነሽ by the rule. | **RESOLVED 19 Oct (Yosief): ወዳቂ** (mark on the last letter). |
| A3 | ጸሎት ዘዘወትር (ጸሎተ ማርያም title) | §13 / #419 | **ወላዲተ** (ማርያም ድንግል ወላዲተ ኣምላክ።) | ተነሽ | ተጣይ | Same as A1. Also, ወላዲተ‿አምላክ is ተጣይ in all 24 other places in the app. | **RESOLVED 19 Oct (Yosief): joined as ተናባቢ with the next word, ወላዲተ‿ኣምላክ ተጣይ**, the same as the 24 other ወላዲተ‿አምላክ places. The clips 419 and 420 were joined into one, and the later clips were renumbered (the unit is now #419, and everything after it moves up by one). Flag: the next word is spelled **ኣምላክ** (with ኣ) here, not አምላክ. The spelling was left as it is. |
| A4 | ጸሎት ዘዘወትር (ታዐብዮ) | §13 / #450 | **ሕሊና‿ልቦሙ** (ለእለ ያዐብዩ ሕሊና ልቦሙ) | ተነሽ | ተጣይ | Same as A1. | **RESOLVED 19 Oct (Yosief): keep joined, ተነሽ (ተለዓሊ).** It is now unit #449. |
| A5 | ጸሎት ዘዘወትር | §10 / #326 | **ለመንፈስ‿ቅዱስ** (ስብሐት ለአብ · ስብሐት ለወልድ · ስብሐት ለመንፈስ ቅዱስ) | ሰያፍ | ተጣይ | Source ጣ. In the same line ለአብ and ለወልድ are ተጣይ. It keeps ሰያፍ only because ቅዱስ ends in ሳድስ. | **RESOLVED 19 Oct (Yosief): joined, ተጣይ.** |
| A6 | ጸሎት ዘዘወትር | §3 / #47 | **ይትቀነይ** (ወለከ ይትቀነይ ኩሉ ልሳን) | ሰያፍ | ተጣይ | Source ጣ. Same origin as A5. | **RESOLVED 19 Oct (Yosief): keep ሰያፍ.** |
| A7 | ጸሎት ዘዘወትር (አቡነ ዘበሰማያት) | §4 / #79–80 | **በከመ‿በሰማይ / ከማሁ** | ተጣይ / ወዳቂ | ወዳቂ / ተጣይ | Source: በከመ-በሰማይ ቂ, ከማሁ ጣ. The app has the two marks **swapped**, which looks like an off-by-one. | **RESOLVED 19 Oct (Yosief): ከማሁ ወዳቂ; በከመ‿በሰማይ joined, ተጣይ.** That is what the app already had, so nothing changed. |
| A8 | ጸሎት ዘዘወትር (አቡነ ዘበሰማያት) | §4 / #84–85 | **ሃበነ / ዮም** (ዕለትነ ሃበነ ዮም) | ተነሽ / ተጣይ | ተጣይ on ሃበነ? | Source has ሃበነ ጣ and **no tag on ዮም**. Its text is broken here too (ሲሳየነዘለለ, ለነአበሳነ run together), so I can't tell which word the ጣ belongs to. | **RESOLVED 19 Oct (Yosief): keep ሃበነ ተነሽ.** |
| A9 | ውዳሴ ማርያም ዘሰሉስ | §2 / #16 | **ቃለ** (ዘእግዚአብሔር ቃለ ዘኮነ ሰብአ) | ተነሽ | ተጣይ? | Source reads **ቃለ-አብ ጣ** (joined, with አብ), but the app text is just ቃለ. The text differs, so the mark is unclear. | open |
| A10 | ውዳሴ ማርያም ዘሰሉስ | §2 / #31 | **ኃይለ‿ወሊዶታ** (መንክር ኃይለ ወሊዶታ ዘኢይትነገር) | ወዳቂ | ተጣይ | Source ጣ. I found no owner note for this one. | open |
| A11 | ውዳሴ ማርያም ዘረቡዕ | §9 / #392 | **ምሕረተ** (ዘአልቦ ምሕረተ) | ተነሽ | ተጣይ? | Source text is **ምሕረት** (ሳድስ) ጣ, the app text is ምሕረተ (ዕዝል). Please check both the spelling and the mark. | open |
| A12 | ውዳሴ ማርያም ዘእሁድ | §3 / #74, §7 / #187, §8 / #207 | **ዘእግዚአብሔር** (ዘእግዚአብሔር ቃል(ለ)) | ወዳቂ | ተጣይ | Source ጣ all 3 times. Sunday has no recording, so nobody has checked it by ear. ውዳሴ ሠሉስ #15 also has ወዳቂ (source ተ there). | open |
| A13 | ውዳሴ ማርያም ዘእሁድ | §3 / #80 | **መለኮት** (ወኢዉላጤ መለኮት ንጹሕ) | ወዳቂ | ተጣይ | Source ጣ, and Sunday has no recording. | open |
| A14 | ውዳሴ ማርያም ዘሰኑይ | §3 / #36 | **ልቡ** (ሠምረ ልቡ ኀበ ፍቅረ ሰብእ) | ወዳቂ | (ተጣይ?) | Source ጣ, but ሰኑይ is "fully confirmed" by Yosief, so this is probably his choice. Listed only so he can confirm. | open |
Note against A1–A6: when Yosief reviewed three words from this same group (ብእሴ, ወኢምንትኒ, ዘበሰማይኒ, all source ጣ and first built wrongly as ሰያፍ), he chose **ወዳቂ**, not ተጣይ. That's why I didn't switch A1–A6 to ተጣይ myself.

## B. App shows ተጣይ where the source says ቂ (the opposite direction, where we may have *added* ተጣይ)
| # | Prayer | Unit | Word | App now | Source | Why it's in doubt |
|---|---|---|---|---|---|---|
| B1 | ጸሎት ዘዘወትር | #45 | ብርክ (ኩሉ ብርክ) | ተጣይ | ወዳቂ | No owner note. |
| B2 | ጸሎት ዘዘወትር | #96 | ውስተ‿መንሱት | ተጣይ | ወዳቂ | No owner note. |
| B3 | ጸሎት ዘዘወትር | #153 | ገባሬ‿ሰማያት (ወምድር) | ተጣይ | ወዳቂ | No owner note. |
| B4 | ጸሎት ዘዘወትር | #293 | በመለኮት። (ወይትዋሐዱ በመለኮት) | ሰያፍ | ወዳቂ | Source ቂ at the end of a sentence. The app has ሰያፍ only because ት is ሳድስ. |
| B5 | ውዳሴ ዘሰሉስ | #60 | ወመላእክተ‿እግዚአብሔር | ተጣይ | ወዳቂ | |
| B6 | ውዳሴ ዘሰሉስ | #72 | በነደ‿እሳት | ተጣይ | ወዳቂ | |
| B7 | ውዳሴ ዘቀዳሚት | #47 | ኀበ‿እግዚአብሔር (አቡሁ) | ተጣይ | ወዳቂ | |
| B8 | ውዳሴ ዘሰኑይ | #61, #134 | በመንፈሰ‿ትንቢት, ለነቢያት | ተጣይ | ወዳቂ | ሰኑይ is confirmed, so this is likely fine. |
| B9 | all ውዳሴ days | ሰኑይ #3; ሠሉስ #3, 12, 46, 172, 275, 312, 349; ረቡዕ #3, 18, 114, 171, 225, 270, 373; ሐሙስ #3, 207 | **ድንግል** | ተጣይ | ወዳቂ | The app makes ድንግል ተጣይ everywhere, as the ጸሎት ዘዘወትር source does, while the ውዳሴ source often has ቂ. This matches confirmed ሰኑይ #3, so it's probably intended. One yes/no from Yosief covers all 17. |

## C. The same word marked differently in different places (the source has them this way too; worth a listen)
- **ኦ**: ወዳቂ 62 times, but ቀዳሚት #60 (ኦ ማርያም) and #101 (ኦ ወላዲተ አምላክ) are ተጣይ, and እሁድ #225 (ኦ ወላዲተ ክርስቶስ) is ተነሽ.
- **መንክር**: ተጣይ 6 times, ወዳቂ once (ሐሙስ #250).
- **ላዕሌሃ**: ተጣይ 4 times, ወዳቂ twice (ሰኑይ #28, ሐሙስ #91).
- **ቅዱሰ**: ተነሽ twice, ተጣይ once (ዓርብ #100). **ወሀበነ** and **ነሥአ**: ተነሽ once and ተጣይ once each, both within ዓርብ (#70/#98, #73/#101).
- **ላዕሌኪ**: ተነሽ 4 times, ተጣይ once (ቀዳሚት #57). **አማን**: ሰያፍ 3 times, ተጣይ once (ሐሙስ #430). **አምላክነ**: ተነሽ (ዓርብ #136) vs ተጣይ (እሁድ #227).
- Some of these may be right, since a Ge'ez word's reading can change with its place in the sentence. That's why none were normalized.

## Not doubts (for the record)
- 95 units show ሰያፍ where the source tag is ተ, because the word ends in ሳድስ (e.g. ጽዮን, ንሰግድ, ገብርኤል). That is Yosief's hard rule, so they stay.
- ብእሴ, ወኢምንትኒ, ዘበሰማይኒ, ወዘበምድርኒ are ወዳቂ by Yosief's own correction (source ጣ), so they stay.
