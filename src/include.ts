import { Entry } from './contentful/types'
import { ContentfulDataSource } from './dataSource'
import { isAssetLink, isEntryLink } from './util'

export interface DataSourceWithInclude extends ContentfulDataSource {
  /** Given an entry, resolves it down to the specified depth */
  resolveEntry<T extends Entry>(entry: T, depth: number): Promise<T>
}

/**
 * Wraps a data source to automatically resolve linked entries and assets,
 * replacing links recursively down the tree by fetching the linked entries
 * by ID.
 */
export function withInclude<TDataSource extends ContentfulDataSource>(
  dataSource: TDataSource
): TDataSource {
  if ((dataSource as any).__withInclude) {
    // We've already wrapped this data source
    return dataSource
  }

  const oldGetEntries = dataSource.getEntries

  return Object.assign(dataSource, {
    __withInclude: true,
    getEntries: async (query?: any) => {
      if (query?.include && query.include > 10)
        throw new Error('Maximum include depth exceeded (10)')

      const result = await oldGetEntries.call(dataSource, query)
      if (!query?.include)
        return result

      for(let i = 0; i < result.items.length; i++) {
        result.items[i] = await resolveEntry.call(dataSource, result.items[i] as Entry, query.include)
      }

      return result
    },
    resolveEntry: resolveEntry.bind(dataSource)
  }) as unknown as TDataSource
}

async function resolveEntry(this: ContentfulDataSource, entry: Entry, depth: number) {
  if (depth <= 0) { return entry }

  for(const field of Object.keys(entry.fields)) {
    const value = entry.fields[field]
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        value[i] = await resolveValue.call(this, value[i], depth)
      }        
    } else {
      entry.fields[field] = await resolveValue.call(this, value, depth)
    }
  }
  return entry
}

async function resolveValue(this: ContentfulDataSource, value: unknown, depth: number) {
  if (isEntryLink(value)) {
    const entry = await this.getEntry(value.sys.id)
    if (entry) {
      return resolveEntry.call(this, entry, depth - 1)
    }
  } else if(isAssetLink(value)) {
    return await this.getAsset(value.sys.id)
  } else {
    return value
  }
}

/**
 * Enhances a DataSource to automatically resolve linked entries and assets,
 * replacing links recursively down the tree by fetching the linked entries
 * by ID.
 */
export function addInclude<TDataSource extends ContentfulDataSource>(
  dataSource: TDataSource
): asserts dataSource is TDataSource & DataSourceWithInclude {
  withInclude(dataSource)
}