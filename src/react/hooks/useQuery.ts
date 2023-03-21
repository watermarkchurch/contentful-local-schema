import { useCallback, useEffect, useState } from 'react'

import { ContentfulDataSource } from '../../dataSource'
import { useDataSource } from '../context'

/**
 * Executes a query function against the dataSource and returns the result.
 * 
 * The result is in one of 3 states:
 * 1. Loading, no result available
 * 2. Error, result may or may not be available
 * 3. Success, result is available
 * 
 * Re-running the query does not set "loading: true", the loading flag is intended
 * for the initial load use case.
 * 
 * Example:
 * const [result, { loading, error, refreshing }, refresh] = useQuery(async (dataSource) => { ... })
 */
export type UseQueryResult<TResult> =
  [
    TResult | undefined,
    UseQueryState,
    () => Promise<void>
  ]

export interface UseQueryState {
  /**
   * The error that occurred during the last query.  This is undefined if the query was successful.
   */
  error?: Error,

  /**
   * True if the initial query that is run when the component is mounted is still in progress.
   */
  loading: boolean,
  /**
   * True if the "refresh" method was invoked by the component and the query has not yet completed.
   * 
   * This is useful for showing a "refreshing" indicator in the UI in response to a user action that
   * triggered the "refresh" method.
   */
  refreshing: boolean

  /**
   * True if the dataSource has been updated and the query has not yet been re-run.
   * 
   * If autoUpdate is true (or undefined), this will only be true for the time it takes the async query to resolve.
   */
  stale: boolean
}

export interface UseQueryOptions {
  /**
   * If true, the query will be re-run whenever the dataSource is updated.
   * Otherwise the stale indicator will be set to true.
   * 
   * Defaults to true.
   */
  autoRefresh?: boolean
}

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

  options?: UseQueryOptions,

  /**
   * Control when the query will be re-run.  The query is always re-run when the dataSource is updated.
   */
  deps?: React.DependencyList
): UseQueryResult<TResult> {
  
  const [dataSource, {revision}, _refresh] = useDataSource()

  const [result, setResult] = useState<TResult>()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [resultsRevision, setResultsRevision] = useState(0)
  const [error, setError] = useState<Error>()

  // The query function is often constructed inline, so we need to memoize it.
  // When the given deps change, this function will change, which will cause the useEffect to re-run.
  const memoizedQuery = useCallback(query, deps || [])

  // Run the query automatically when the dataSource is updated or the deps change.
  useEffect(() => {
    if (!loading && options?.autoRefresh === false) { return }

    // The InMemoryStore is sync, not async.  Thus, these queries never get offloaded from the main thread
    // and can hold up react rendering.  Render one frame of "loading" before the query.
    const frame = requestAnimationFrame(() => {
      const executeQuery = async () => {
        const result = await query(dataSource)
        setResult(result)
        setResultsRevision(revision)
      }

      executeQuery()
        .catch((e) => setError(e))
        .finally(() => {
          setLoading(false)
        })
    })
    return () => { cancelAnimationFrame(frame) }
  }, [memoizedQuery, revision, options?.autoRefresh])

  // Run the query manually when refresh is invoked.
  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const newRevision = await _refresh()
      const result = await query(dataSource)
      setResult(result)
      setResultsRevision(newRevision)
    } finally {
      setRefreshing(false)
    }
  }, [memoizedQuery, _refresh, revision])

  return [
    result,
    {
      loading,
      error,
      refreshing,
      stale: revision > resultsRevision
    },
    refresh
  ]
}

export function isDependencyList(value: any): value is React.DependencyList {
  return Array.isArray(value)
}
