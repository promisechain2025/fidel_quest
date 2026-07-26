/* Canonical subject taxonomy for the tutor board. A subject is WHAT a
   teacher teaches; it is distinct from `languages`, which is the medium of
   instruction (a teacher can teach Math in Amharic).

   Deliberately academic and neutral: history, culture, and religious
   studies are intentionally left to the free-text "focus" field and "Other"
   rather than enumerated here, because for the Ethiopian and Eritrean
   communities those topics are politically and religiously sensitive - the
   same reason the language landing pages are kept separate. Numbers and
   science travel without that baggage, which is exactly why they are a safe
   first expansion beyond fidel.

   Mirror of website/src/subjects.js - keep the ids identical. */
export const SUBJECTS = [
  { id: 'amharic', label: 'Amharic reading & writing' },
  { id: 'tigrinya', label: 'Tigrinya reading & writing' },
  { id: 'math', label: 'Mathematics' },
  { id: 'science', label: 'Science' },
  { id: 'english', label: 'English' },
  { id: 'other', label: 'Other' },
]

export const SUBJECT_IDS = SUBJECTS.map((s) => s.id)
export const isSubject = (id) => SUBJECT_IDS.includes(id)

/** Sanitize an incoming subjectTags array to known ids (dedup, capped). */
export function cleanSubjectTags(raw) {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter(isSubject))].slice(0, SUBJECT_IDS.length)
}
