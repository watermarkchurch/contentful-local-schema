import { Asset, Entry } from './contentful/types'
import { ContentfulDataSource } from './dataSource'
import { isAssetLink, isEntryLink } from './util'

export interface DataSourceWithResolve extends ContentfulDataSource {
  /** Given an entry, resolves it down to the specified depth */
  resolveEntry<T extends Record<string, unknown>>(entry: Entry<T>, depth: number): Promise<Entry<T>>
}

/**
 * Wraps a data source to automatically resolve linked entries and assets,
 * replacing links recursively down the tree by fetching the linked entries
 * by ID.
 */
export function withResolve<TDataSource extends ContentfulDataSource>(
  dataSource: TDataSource
): TDataSource {
  if ((dataSource as any).__withResolve) {
    // We've already wrapped this data source
    return dataSource
  }

  const oldGetEntries = dataSource.getEntries

  return Object.assign(dataSource, {
    __withResolve: true,
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

async function resolveEntry<T extends Record<string, unknown>>(this: ContentfulDataSource, entry: Entry<T>, depth: number, seen: Map<string, Entry | Asset | null> = new Map()) {
  if (depth <= 0) { return entry }

  const fieldNames = Object.keys(entry.fields) as Array<keyof T>
  for(const field of fieldNames) {
    const value = entry.fields[field]
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const v = value[i]
        if (!isEntryLink(v) && !isAssetLink(v)) { continue }

        if (seen.has(v.sys.id)) {
          const got = seen.get(v.sys.id)
          value[i] = got
          // We've tried resolving this link before, even if we failed, no need to try again
          continue
        }

        if (isEntryLink(v)) {
          let linkedEntry = await this.getEntry(v.sys.id)
          seen.set(v.sys.id, linkedEntry)
          if (linkedEntry) {
            linkedEntry = await resolveEntry.call(this, linkedEntry, depth - 1, seen)
          }
          value[i] = linkedEntry
        } else {
          const linkedAsset = await this.getAsset(v.sys.id)
          seen.set(v.sys.id, linkedAsset)
          value[i] = linkedAsset
        }
        
      }        
    } else {
      // This logic intentionally duplicated to avoid excess awaits when value is not a link
      if (!isEntryLink(value) && !isAssetLink(value)) { continue }

      if (seen.has(value.sys.id)) {
        const got = seen.get(value.sys.id)
        entry.fields[field] = got as T[keyof T]
        // We've tried resolving this link before, even if we failed, no need to try again
        continue
      }

      if (isEntryLink(value)) {
        let linkedEntry = await this.getEntry(value.sys.id)
        seen.set(value.sys.id, linkedEntry)
        if (linkedEntry) {
          linkedEntry = await resolveEntry.call(this, linkedEntry, depth - 1, seen)
        }
        entry.fields[field] = linkedEntry as T[keyof T]
      } else {
        const linkedAsset = await this.getAsset(value.sys.id)
        seen.set(value.sys.id, linkedAsset)
        entry.fields[field] = linkedAsset as T[keyof T]
      }
    }
  }

  return entry
}

/**
 * Enhances a DataSource to automatically resolve linked entries and assets,
 * replacing links recursively down the tree by fetching the linked entries
 * by ID.
 */
export function addResolve<TDataSource extends ContentfulDataSource>(
  dataSource: TDataSource
): asserts dataSource is TDataSource & DataSourceWithResolve {
  withResolve(dataSource)
}

export function hasResolveEntry(dataSource: any): dataSource is DataSourceWithResolve {
  return typeof dataSource.resolveEntry === 'function'
}