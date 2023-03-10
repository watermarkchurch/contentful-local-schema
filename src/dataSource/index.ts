import type { Asset, AssetCollection, Entry, EntryCollection } from '../contentful/types'

export interface ContentfulDataSource {
  getAsset(id: string): Promise<Asset | null> | Asset | null
  getAssets(query?: any): Promise<AssetCollection> | AssetCollection
  getEntry<T = Record<string, unknown>>(id: string): Promise<Entry<T> | null> | Entry<T> | null
  getEntries<T = Record<string, unknown>>(query?: any): Promise<EntryCollection<T>> | EntryCollection<T>
}
