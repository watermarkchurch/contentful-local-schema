import get from 'lodash/get'
import cloneDeep from 'lodash/cloneDeep'

import type { Asset, AssetCollection, ContentfulClientApi, Entry, EntryCollection } from "contentful";
import { ContentfulDataSource } from ".";
import { isAsset, isDeletedAsset, isDeletedEntry, isEntry, SyncItem } from '../util';


export class InMemoryDataSource implements ContentfulDataSource {
  private readonly _entries: Map<string, Entry<any>>
  private readonly _assets: Map<string, Asset>

  constructor(
    private readonly defaultLocale = 'en-US',
  ) {
    this._entries = new Map()
    this._assets = new Map()
  }

  public index(syncItem: SyncItem): void {
    if (isEntry(syncItem)) {
      this._entries.set(syncItem.sys.id, cloneDeep(syncItem))
    } else if(isAsset(syncItem)) {
      this._assets.set(syncItem.sys.id, cloneDeep(syncItem))
    } else if(isDeletedEntry(syncItem)) {
      this._entries.delete(syncItem.sys.id)
    } else if(isDeletedAsset(syncItem)) {
      this._assets.delete(syncItem.sys.id)
    } else {
      throw new Error(`Unrecognized sync item: ${(syncItem as any)?.sys?.type}`)
    }
  }

  public getAsset(id: string, query?: any): Asset | undefined {
    return cloneDeep(this._assets.get(id))
  }
  public getAssets(query?: any): AssetCollection {
    let filters = query ? this.parseQuery(query) : []

    const items: Asset[] = []
    for(const asset of this._assets.values()) {
      if (filters.findIndex((f) => !f(asset)) == -1) {
        // No filters returned false.
        items.push(cloneDeep(asset))
      }
    }

    return {
      total: items.length,
      skip: 0,
      limit: 0,
      items,
      toPlainObject() {
        return this
      }
    }
  }

  public getEntry<T>(id: string): Entry<T> | undefined {
    return cloneDeep(this._entries.get(id))
  }
  public getEntries<T = { [key: string]: any }>(query?: any): EntryCollection<T> {
    let filters = query ? this.parseQuery(query) : []

    const items: Entry<T>[] = []
    for(const entry of this._entries.values()) {
      if (filters.findIndex((f) => !f(entry)) == -1) {
        // No filters returned false.
        items.push(cloneDeep(entry))
      }
    }

    return {
      total: items.length,
      skip: 0,
      limit: 0,
      items,
      toPlainObject() {
        return this
      },
      stringifySafe() {
        throw new Error(`Not Implemented`)
      }
    }
  }

  private parseQuery(query: any): Filter[] {
    const filters: Filter[] =
      Object.keys(query).map<Filter>((key) => {
        const value = query[key]
        if (key == 'content_type') {
          // special case
          return (e) => e.sys.contentType.sys.id == query.content_type
        }
  
        let op = 'eq'
        const match = /\[(?<op>\w+)\]$/.exec(key)
        if (match && match.groups && match.groups.op) {
          op = match.groups.op
          key = key.substring(0, match.index)
        }

        const s = selector(key, this.defaultLocale)
        switch(op) {
          case 'eq':
            return eqOp(s, value)
          case 'ne':
            return neOp(s, value)
          case 'in':
            return inOp(s, value)
          default:
            throw new Error(`Operator not implemented: '${op}'`)
        }
      })
  
    return filters
  }
}

type Filter = (e: Entry<any> | Asset) => boolean

const Operators = [
  'eq',
  'ne',
  'in',
] as const

const SysFields = [
  'id'
]

type Selector = (e: Entry<any> | Asset) => any

function selector(key: string, locale: string): Selector {
  if (SysFields.includes(key)) {
    key = 'sys.' + key
  } else if (!key.startsWith('fields.') && !key.startsWith('sys.')) {
    key = 'fields.' + key
  }

  return (e) => {
    const value = get(e, key)
    if (e.sys.locale || typeof value != 'object') {
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