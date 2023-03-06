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
  [undefined, { error?: undefined, loading: true }] |
  [Asset | null | undefined, { error: Error, loading: false }] |
  [Asset | null | undefined, { error?: undefined, loading: false }]

export function useFindAsset(id: string): UseFindAssetResult {
  const [dataSource, updatedAt] = useDataSource()

  const [found, setFound] = useState<Asset>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()

  useEffect(() => {
    const doIt = async () => {
      const result = await dataSource.getAsset(id)
      setFound(result)
    }

    setError(undefined)
    doIt()
      .catch((e) => setError(e))
      .finally(() => setLoading(false))
  }, [id, updatedAt])

  return [found, { loading, error }] as UseFindAssetResult
}