import { useEffect, useState } from 'react'
import type { Asset } from '../../contentful/types'
import { useDataSource } from '../context'

/**
 * The result is in one of 3 states:
 * 1. Loading, asset not available
 * 2. Error, asset may or may not be available
 * 3. Success, but asset may not have been found (undefined)
 * 
 * Re-running the query does not set "loading: true", the loading flag is intended
 * for the initial load use case.
 */
export type UseFindAssetResult =
  [Asset | null | undefined, { error?: undefined, loading: boolean, refreshing: boolean }, () => Promise<void>]

export function useFindAsset(id: string): UseFindAssetResult {
  const [dataSource, updatedAt, refresh] = useDataSource()

  const [found, setFound] = useState<Asset>()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<Error>()

  useEffect(() => {
    const doIt = async () => {
      const result = await dataSource.getAsset(id)
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

  return [found, { loading, error, refreshing }, refresh] as UseFindAssetResult
}