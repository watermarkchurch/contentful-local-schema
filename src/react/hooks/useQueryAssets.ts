import { useEffect, useState } from 'react'
import type { AssetCollection, EntryCollection } from '../../contentful/types'
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
export type UseQueryAssetsResult =
  [undefined, { error?: undefined, loading: true }] |
  [AssetCollection | undefined, { error: Error, loading: false }] |
  [AssetCollection, { error?: undefined, loading: false }]

export function useQueryAssets(
  query?: any
): UseQueryAssetsResult {
  const [dataSource, updatedAt] = useDataSource()

  const [found, setFound] = useState<EntryCollection<any>>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()

  useEffect(() => {
    const doIt = async () => {
      const result = await dataSource.getAssets({
        ...query
      })
      setFound(result)
    }

    setError(undefined)
    doIt()
      .catch((e) => setError(e))
      .finally(() => setLoading(false))
  }, [query, updatedAt])

  return [found, { loading, error }] as UseQueryAssetsResult
}