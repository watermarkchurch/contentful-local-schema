import type { Asset, AssetCollection, Entry, EntryCollection, Sys } from "../contentful/types";

export interface ContentfulDataSource {
  getAsset(id: string): Promise<Asset | undefined> | Asset | undefined
  getAssets(query?: any): Promise<AssetCollection> | AssetCollection
  getEntry<T>(id: string): Promise<Entry<T> | undefined> | Entry<T> | undefined
  getEntries<T>(query?: any): Promise<EntryCollection<T>> | EntryCollection<T>
}

export type SyncItem =
  Entry<any> |
  Asset |
  DeletedEntry |
  DeletedAsset

export interface DeletedEntry {
  sys: Sys & { type: 'DeletedEntry' }
}

export interface DeletedAsset {
  sys: Sys & { type: 'DeletedAsset' }
}
