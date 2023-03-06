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
  [Entry<T> | null | undefined, { error?: undefined, loading: boolean, refreshing: boolean }, () => Promise<void>]

export function useFindEntry<T = any>(id: string): UseFindEntryResult<T> {
  const [dataSource, updatedAt, refresh] = useDataSource()

  const [found, setFound] = useState<Entry<any>>()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<Error>()

  useEffect(() => {
    const doIt = async () => {
      const result = await dataSource.getEntry(id)
      setFound(result)
    }

    setRefreshing(true)
    setError(undefined)
    doIt()
      .catch((e) => setError(e))
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }, [id, updatedAt])

  return [found, { loading, error, refreshing }, refresh] as UseFindEntryResult<T>
}