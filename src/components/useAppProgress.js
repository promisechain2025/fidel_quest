import { useMemo } from 'react'
import { useChildModel } from '../platform/childModel'
import { loadAppProgress, summarize } from '../platform/appProgress'

/** Re-reads the app-level progress store whenever any child state changes. */
export function useAppProgress() {
  const rev = useChildModel()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => summarize(loadAppProgress()), [rev])
}
