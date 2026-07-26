/* Subject taxonomy for the tutor board - MIRROR of api/subjects.js. Keep the
   ids identical (the API validates apply submissions and the ?subject filter
   against its own copy). WHAT a teacher teaches, distinct from the language
   they teach in. History/culture/religion are deliberately left to "Other"
   and free text - see api/subjects.js for the reasoning. */
export const SUBJECTS = [
  { id: 'amharic', label: 'Amharic reading & writing' },
  { id: 'tigrinya', label: 'Tigrinya reading & writing' },
  { id: 'math', label: 'Mathematics' },
  { id: 'science', label: 'Science' },
  { id: 'english', label: 'English' },
  { id: 'other', label: 'Other' },
]

export const SUBJECT_LABEL = Object.fromEntries(SUBJECTS.map((s) => [s.id, s.label]))
