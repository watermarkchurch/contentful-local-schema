import type { Asset } from '../../contentful/types'
import { useQuery, UseQueryOptions, UseQueryResult } from './useQuery'

export type UseFindAssetResult =
  UseQueryResult<Asset | null | undefined>

/**
 * Queries the dataSource for an asset by ID.
 * 
 * If the asset does not exist, the result will be null.
 * The result will be undefined while the query is loading.
 */
export function useFindAsset(
  id: string,
  options?: UseQueryOptions,

  /** Overrides the dependency list to control when the query is re-run */
  deps?: React.DependencyList
): UseFindAssetResult {

  return useQuery<Asset | null | undefined>(
    async (dataSource) => {
      return (await dataSource.getAsset(id)) || null
    },
    options,
    deps || [id])
}