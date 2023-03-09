import { useCallback, useEffect, useState } from 'react'

import { ContentfulDataSource } from '../../dataSource'
import { useDataSource } from '../context'

/**
 * The result is in one of 3 states:
 * 1. Loading, no result available
 * 2. Error, result may or may not be available
 * 3. Success, result is available
 * 
 * Re-running the query does not set "loading: true", the loading flag is intended
 * for the initial load use case.
 */
export type UseQueryResult<TResult> =
  [TResult | undefined, { error?: Error, loading: boolean, refreshing: boolean }, () => Promise<void>]

/**
 * Executes an arbitrary query against the dataSource.  The result is stored in the
 * first element of the returned tuple.
 * 
 * The result will be undefined until the query successfully completes the first time.
 * The query will be rerun whenever the dataSource is updated or one of the "deps" changes.
 */
export function useQuery<TResult>(
  /**
   * The query to execute.  The return value is stored in the first element of the returned tuple.
   */
  query: (dataSource: ContentfulDataSource) => Promise<TResult> | TResult,

  /**
   * Control when the query will be re-run.  The query is always re-run when the dataSource is updated.
   */
  deps?: React.DependencyList
): UseQueryResult<TResult> {
  const [dataSource, updatedAt, refresh] = useDataSource()

  const [result, setResult] = useState<TResult>()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<Error>()

  // The query function is often constructed inline, so we need to memoize it.
  // When the given deps change, this function will change, which will cause the useEffect to re-run.
  const memoizedQuery = useCallback(query, deps || [])

  useEffect(() => {
    const doIt = async () => {
      const result = await query(dataSource)
      setResult(result)
    }

    setRefreshing(true)
    setError(undefined)

    // The InMemoryStore is sync, not async.  Thus, these queries never get offloaded from the main thread
    // and can hold up react rendering.  Render one frame of "loading" before the query.
    const frame = requestAnimationFrame(() => {
      doIt()
        .catch((e) => setError(e))
        .finally(() => {
          setLoading(false)
          setRefreshing(false)
        })
    })
    return () => { cancelAnimationFrame(frame) }
  }, [memoizedQuery, updatedAt])

  return [result, { loading, error, refreshing }, refresh] as [TResult, { loading: boolean, error?: Error, refreshing: boolean }, () => Promise<void>]
}