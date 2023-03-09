import type { Entry } from '../../contentful/types'
import { hasResolveEntry } from '../../resolve'
import { useQuery, UseQueryResult } from './useQuery'

export type UseFindEntryResult<T> =
  UseQueryResult<Entry<T> | null | undefined>


/**
 * Queries the dataSource for an entry by ID.
 * The entry will be resolved down to the specified depth if provided.
 * 
 * If the entry does not exist, the result will be null.
 * The result will be undefined while the query is loading.
 */
export function useFindEntry<T extends Record<string, unknown> = any>(
  id: string,
  options?: { include?: number },

  /** Overrides the dependency list to control when the query is re-run */
  deps?: React.DependencyList
): UseFindEntryResult<T> {

  return useQuery<Entry<T> | null | undefined>(
    async (dataSource) => {
      let result = await dataSource.getEntry<T>(id)
      if (result && options?.include && hasResolveEntry(dataSource)) {
        result = await dataSource.resolveEntry<T>(result, options.include)
      }
      return result || null
    }, deps || [id, options?.include])
}