import { useEffect, useState } from 'react'
import type { Entry } from '../../contentful/types'
import { useDataSource } from '../context'


/**
 * The result is in one of 3 states:
 * 1. Loading, entry not available
 * 2. Error, entry may or may not be available
 * 3. Success, but entry may not have been found (undefined)
 * 
 * Re-running the query does not set "loading: true", the loading flag is intended
 * for the initial load use case.
 */
export type UseFindEntryResult<T> =
  [undefined, { error?: undefined, loading: true }] |
  [Entry<T> | null | undefined, { error: Error, loading: false }] |
  [Entry<T> | null | undefined, { error?: undefined, loading: false }]


export function useFindEntry<T = any>(id: string): UseFindEntryResult<T> {
  const [dataSource, updatedAt] = useDataSource()

  const [found, setFound] = useState<Entry<any>>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()

  useEffect(() => {
    const doIt = async () => {
      const result = await dataSource.getEntry(id)
      setFound(result)
    }

    setError(undefined)
    doIt()
      .catch((e) => setError(e))
      .finally(() => setLoading(false))
  }, [id, updatedAt])

  return [found, { loading, error }] as UseFindEntryResult<T>
}