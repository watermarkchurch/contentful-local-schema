import { useRef } from 'react'
import eq from 'lodash/eq'
import type { EntryCollection } from '../../contentful/types'
import { useQuery, UseQueryOptions, UseQueryResult } from './useQuery'

export type UseQueryEntriesResult<T> =
  UseQueryResult<EntryCollection<T>>

export function useQueryEntries<T = any>(
  /**
   * The content type must be provided when querying entries to ensure that the
   * query comparison is being made against the correct data type.
   * For example: "title" of a "blogPost" is different than "title" of a "person".
   */
  contentType: string,
  /**
   * The query object that is used to match entries in the data source.
   * 
   * The special query parameters "skip", "limit", "locale", and "include"
   * can be used to control the pagination and normalization of the results.
   */
  query?: Record<string, any>,

  options?: UseQueryOptions,

  /** Overrides the dependency list to control when the query is re-run */
  deps?: React.DependencyList
): UseQueryEntriesResult<T> {
  // Since the query object is often constructed inline, we need to use a ref and update it manually w/ deep comparison
  const ref = useRef(query)
  if (!eq(query, ref.current)) {
    ref.current = query
  }

  return useQuery<EntryCollection<T>>(
    async (dataSource) => {
      return await dataSource.getEntries({
        content_type: contentType,
        ...query
      })
    },
    options,
    deps || [contentType, ref.current])
}