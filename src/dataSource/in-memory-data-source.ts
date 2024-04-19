import get from 'lodash/get'
import cloneDeep from 'lodash/cloneDeep'

import type { Asset, AssetCollection, Entry, EntryCollection, DeletedAsset, DeletedEntry, SyncItem, SyncEntry, SyncAsset } from '../contentful/types'
import type { ContentfulDataSource } from '.'
import { isAsset, isDeletedAsset, isDeletedEntry, isEntry } from '../util'
import { Syncable } from '../syncEngine'
import { Exportable, Importable } from '../backup'


export class InMemoryDataSource implements ContentfulDataSource, Syncable, Exportable, Importable {
  private _entries: Map<string, SyncEntry | DeletedEntry>
  private _assets: Map<string, SyncAsset | DeletedAsset>
  private _syncToken: string | undefined | null

  constructor(
    private readonly defaultLocale = 'en-US',
  ) {
    this._entries = new Map()
    this._assets = new Map()
  }

  public getToken() {
    return this._syncToken || null
  }

  public setToken(token: string) {
    this._syncToken = token
  }

  public index(syncItem: SyncItem): void {
    if (isEntry(syncItem) || isDeletedEntry(syncItem)) {
      const prev = this._entries.get(syncItem.sys.id)
      if (!prev || Date.parse(prev.sys.updatedAt) <= Date.parse(syncItem.sys.updatedAt)) {
        this._entries.set(syncItem.sys.id, cloneDeep(syncItem))
      }

    } else if(isAsset(syncItem) || isDeletedAsset(syncItem)) {
      const prev = this._assets.get(syncItem.sys.id)
      if (!prev || Date.parse(prev.sys.updatedAt) <= Date.parse(syncItem.sys.updatedAt)) {
        this._assets.set(syncItem.sys.id, cloneDeep(syncItem))
      }

    } else {
      throw new Error(`Unrecognized sync item: ${(syncItem as any)?.sys?.type}`)
    }
  }

  public getAsset(id: string, query?: any): Asset | null {
    const asset = this._assets.get(id)
    if (asset && !isDeletedAsset(asset)) {
      return this.denormalizeForLocale(asset, query?.locale || this.defaultLocale)
    }
    return null
  }

  public getAssets(query?: any): AssetCollection {
    const filters = query ? this.parseQuery(query) : []
    const skip = query?.skip || 0
    const limit = query?.limit || 0

    let skipped = 0
    let matchCount = 0

    const items: Asset[] = []
    for(const asset of this._assets.values()) {
      if (isDeletedAsset(asset)) { continue }

      if (filters.findIndex((f) => !f(asset)) == -1) {
        // No filters returned false.
        matchCount++
        if (skipped < skip) {
          skipped++
          continue
        }
        if (limit > 0 && items.length >= limit) {
          continue
        }

        items.push(this.denormalizeForLocale(asset, query?.locale || this.defaultLocale))
      }
    }

    return {
      total: matchCount,
      skip,
      limit,
      items
    }
  }

  public getEntry<T>(id: string, query?: any): Entry<T> | null {
    const entry = this._entries.get(id)
    if (entry && !isDeletedEntry(entry)) {
      return this.denormalizeForLocale(entry, query?.locale || this.defaultLocale)
    }
    return null
  }

  public getEntries<T = { [key: string]: any }>(query?: any): EntryCollection<T> {
    const filters = query ? this.parseQuery(query) : []
    const skip = query?.skip || 0
    const limit = query?.limit || 0

    let skipped = 0
    let matchCount = 0

    const items: Entry<T>[] = []
    for(const entry of this._entries.values()) {
      if (isDeletedEntry(entry)) { continue }

      if (filters.findIndex((f) => !f(entry)) == -1) {
        // No filters returned false.
        matchCount++

        if (skipped < skip) {
          skipped++
          continue
        }
        if (limit > 0 && items.length >= limit) {
          continue
        }
        items.push(this.denormalizeForLocale(entry, query?.locale || this.defaultLocale))
      }
    }

    return {
      total: matchCount,
      skip,
      limit,
      items
    }
  }

  public *export() {
    for(const v of this._entries.values()) {
      yield v
    }
    for(const v of this._assets.values()) {
      yield v
    }
  }
  
  public async import(
    items: Iterable<SyncItem> | AsyncIterable<SyncItem>,
    token: string | null
  ): Promise<void> {
    const newEntries = new Map<string, SyncEntry | DeletedEntry>()
    const newAssets = new Map<string, SyncAsset | DeletedAsset>()

    for await (const item of items) {
      if (isEntry(item) || isDeletedEntry(item)) {
        newEntries.set(item.sys.id, item)
      } else if(isAsset(item) || isDeletedAsset(item)) {
        newAssets.set(item.sys.id, item)
      } else {
        throw new Error(`Unrecognized sync item: ${(item as any)?.sys?.type}`)
      }
    }
    
    // Atomically (i.e. without async) replace the old entries and assets
    this._entries = newEntries
    this._assets = newAssets
    this._syncToken = token
  }

  private parseQuery(query: any): Filter[] {
    const filters: Filter[] =
      Object.keys(query)
        .filter((key) => !['skip', 'limit', 'locale', 'include'].includes(key))
        .map<Filter>((key) => {
          if (key == 'content_type') {
          // special case
            return (e) => isEntry(e) && e.sys.contentType.sys.id == query.content_type
          }
          const expected = query[key]
  
          let op = 'eq'
          const match = /\[(\w+)\]$/.exec(key)
          if (match && match[1]) {
            op = match[1]
            key = key.substring(0, match.index)
          }

          const s = selector(key, this.defaultLocale)
          switch(op) {
          case 'eq':
            return eqOp(s, expected)
          case 'ne':
            return neOp(s, expected)
          case 'in':
            return inOp(s, expected)
          case 'gt':
            return gtOp(s, expected)
          case 'lt':
            return ltOp(s, expected)
          case 'gte':
            return gteOp(s, expected)
          case 'lte':
            return lteOp(s, expected)
          default:
            throw new Error(`Operator not implemented: '${op}'`)
          }
        })
  
    return filters
  }

  private denormalizeForLocale(e: SyncEntry, locale: string): Entry<any>
  private denormalizeForLocale(e: SyncAsset, locale: string): Asset
  private denormalizeForLocale(e: SyncEntry | SyncAsset, locale: string): Entry<any> | Asset
  private denormalizeForLocale(e: SyncEntry | SyncAsset, locale: string): Entry<any> | Asset {
    e = cloneDeep(e)
    if (locale == '*') {
      // We'll just pretend that the entry fits the denormalized schema, and let the caller cast it correctly.
      return e as Entry<any> | Asset
    }
    
    type FieldsKey = keyof (SyncEntry | SyncAsset)['fields']

    const returnVal = {
      sys: {
        ...e.sys,
        locale: locale,
      },
      metadata: e.metadata,
      fields: {}
    } as Entry<any> | Asset

    let hasAnyValuesForLocale = false;
    (Object.keys(e.fields) as FieldsKey[]).forEach((field: FieldsKey) => {
      const value = e.fields[field]
      if (typeof value != 'object') { return }
  
      // value is of type { 'en-US': something }
      if (locale in value) {
        hasAnyValuesForLocale = true
        returnVal.fields[field] = value[locale]
      } else {
        // use fallback locale
        const fallback = this.defaultLocale
        if (fallback in value) {
          returnVal.fields[field] = value[fallback]
        }
      }
    })
    if (!hasAnyValuesForLocale && locale != this.defaultLocale) {
      // fall back to default
      return this.denormalizeForLocale(e, this.defaultLocale)
    }

    return returnVal
  }
}

type Filter = (e: Entry<any> | Asset | SyncEntry | SyncAsset) => boolean

const SysFields = [
  'id'
]

type Selector = (e: Entry<any> | Asset | SyncEntry | SyncAsset) => any

function selector(key: string, locale: string): Selector {
  if (SysFields.includes(key)) {
    key = 'sys.' + key
  } else if (!key.startsWith('fields.') && !key.startsWith('sys.')) {
    key = 'fields.' + key
  }

  return (e) => {
    const value = get(e, key)
    if ('locale' in e.sys && e.sys.locale || typeof value != 'object') {
      return value
    }

    // this is a synced entry or locale=* query result
    if (locale in value) {
      return value[locale]
    }

    // This entry has no value for the given locale
    return undefined
  }
}

function eqOp(selector: Selector, expected: any): Filter {
  return (e) => {
    const value = selector(e)
    if (Array.isArray(value)) {
      // https://www.contentful.com/developers/docs/references/content-delivery-api/#/reference/search-parameters/array-equality-inequality
      return value.includes(expected)
    }
    return value == expected
  }
}

function neOp(selector: Selector, expected: any): Filter {
  return (e) => {
    const value = selector(e)
    if (Array.isArray(value)) {
      // https://www.contentful.com/developers/docs/references/content-delivery-api/#/reference/search-parameters/array-equality-inequality
      return !value.includes(expected)
    }
    return value != expected
  }
}

function inOp(selector: Selector, expected: any[]): Filter {
  return (e) => {
    const value = selector(e)
    if (Array.isArray(value)) {
      // https://www.contentful.com/developers/docs/references/content-delivery-api/#/reference/search-parameters/array-equality-inequality
      return expected.findIndex((exp) => value.includes(exp)) != -1
    }
    return expected.includes(value)
  }
}

function gtOp(selector: Selector, expected: any): Filter {
  return (e) => {
    const value = selector(e)
    return value > expected
  }
}

function gteOp(selector: Selector, expected: any): Filter {
  return (e) => {
    const value = selector(e)
    return value >= expected
  }
}

function ltOp(selector: Selector, expected: any): Filter {
  return (e) => {
    const value = selector(e)
    return value < expected
  }
}

function lteOp(selector: Selector, expected: any): Filter {
  return (e) => {
    const value = selector(e)
    return value <= expected
  }
}
