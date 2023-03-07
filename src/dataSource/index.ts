import type { Asset, AssetCollection, Entry, EntryCollection } from '../contentful/types'

export interface ContentfulDataSource {
  getAsset(id: string): Promise<Asset | undefined> | Asset | undefined
  getAssets(query?: any): Promise<AssetCollection> | AssetCollection
  getEntry<T = Record<string, unknown>>(id: string): Promise<Entry<T> | undefined> | Entry<T> | undefined
  getEntries<T = Record<string, unknown>>(query?: any): Promise<EntryCollection<T>> | EntryCollection<T>
}
