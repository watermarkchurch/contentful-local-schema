import { useEffect, useState } from 'react'
import type { EntryCollection } from '../../contentful/types'
import { useDataSource } from '../context'

/**
 * The result is in one of 3 states:
 * 1. Loading, no entries available
 * 2. Error, entries may or may not be available
 * 3. Success, entries are available
 * 
 * Re-running the query does not set "loading: true", the loading flag is intended
 * for the initial load use case.
 */
export type UseQueryEntriesResult<T> =
  [undefined, { error?: undefined, loading: true }] |
  [EntryCollection<T> | undefined, { error: Error, loading: false }] |
  [EntryCollection<T>, { error?: undefined, loading: false }]

export function useQueryEntries<T = any>(
  contentType: string,
  query?: any
): UseQueryEntriesResult<T> {
  const [dataSource, updatedAt] = useDataSource()

  const [found, setFound] = useState<EntryCollection<any>>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()

  useEffect(() => {
    const doIt = async () => {
      const result = await dataSource.getEntries({
        content_type: contentType,
        ...query
      })
      setFound(result)
    }

    setError(undefined)
    doIt()
      .catch((e) => setError(e))
      .finally(() => setLoading(false))
  }, [contentType, query, updatedAt])

  return [found, { loading, error }] as UseQueryEntriesResult<T>
}