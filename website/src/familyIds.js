/* Fidel family ids (the app's src/platform/ethiopic.js, Amharic pack) and
   each family's base letter. Homework and trouble letters use these ids.
   src/platform/teacherDashboard.test.js checks they match the app. */
export const FAMILY_IDS = Object.freeze([["ha", "ሀ"], ["le", "ለ"], ["hha", "ሐ"], ["me", "መ"], ["sse", "ሠ"], ["re", "ረ"], ["se", "ሰ"], ["she", "ሸ"], ["qe", "ቀ"], ["be", "በ"], ["te", "ተ"], ["che", "ቸ"], ["kha", "ኀ"], ["ne", "ነ"], ["nye", "ኘ"], ["a", "አ"], ["ke", "ከ"], ["khe", "ኸ"], ["we", "ወ"], ["ae", "ዐ"], ["ze", "ዘ"], ["zhe", "ዠ"], ["ye", "የ"], ["de", "ደ"], ["je", "ጀ"], ["ge", "ገ"], ["the", "ጠ"], ["chhe", "ጨ"], ["ppe", "ጰ"], ["tse", "ጸ"], ["ttse", "ፀ"], ["fe", "ፈ"], ["pe", "ፐ"]])
export const familyChar = (id) => (FAMILY_IDS.find((f) => f[0] === id) || [id, id])[1]
