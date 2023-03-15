import { useRef } from 'react'
import eq from 'lodash/eq'
import type { AssetCollection } from '../../contentful/types'
import { useQuery, UseQueryOptions, UseQueryResult } from './useQuery'

export type UseQueryAssetsResult = 
  UseQueryResult<AssetCollection>

/**
 * Queries the dataSource for assets matching the given query.
 */
export function useQueryAssets(
  query?: Record<string, any>,
  options?: UseQueryOptions,

  /** Overrides the dependency list to control when the query is re-run */
  deps?: React.DependencyList
): UseQueryAssetsResult {
  // Since the query object is often constructed inline, we need to use a ref and update it manually w/ deep comparison
  const ref = useRef(query)
  if (!eq(query, ref.current)) {
    ref.current = query
  }

  return useQuery<AssetCollection>(
    async (dataSource) => {
      return await dataSource.getAssets({
        ...query
      })
    },
    options,
    deps || [ref.current])
}