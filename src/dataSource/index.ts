import type { Asset, AssetCollection, Entry, EntryCollection } from "contentful";

export interface ContentfulDataSource {
  getAsset(id: string): Promise<Asset | undefined> | Asset | undefined
  getAssets(query?: any): Promise<AssetCollection> | AssetCollection
  getEntry<T>(id: string): Promise<Entry<T> | undefined> | Entry<T> | undefined
  getEntries<T>(query?: any): Promise<EntryCollection<T>> | EntryCollection<T>
}