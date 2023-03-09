import { useEffect, useRef, useState } from 'react'
import eq from 'lodash/eq'
import type { AssetCollection } from '../../contentful/types'
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
  [AssetCollection, { error?: Error, loading: boolean, refreshing: boolean }, () => Promise<void>]

export function useQueryAssets(
  query?: Record<string, any>,

  /** Overrides the dependency list to control when the query is re-run */
  deps?: React.DependencyList
): UseQueryAssetsResult {
  const [dataSource, updatedAt, refresh] = useDataSource()

  const [found, setFound] = useState<AssetCollection>()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<Error>()

  // Since the query object is often constructed inline, we need to use a ref and update it manually w/ deep comparison
  const ref = useRef(query)
  if (!eq(query, ref.current)) {
    ref.current = query
  }

  useEffect(() => {
    const doIt = async () => {
      const result = await dataSource.getAssets({
        ...query
      })
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
  }, deps || [ref.current, updatedAt])

  return [found, { loading, error, refreshing }, refresh] as UseQueryAssetsResult
}