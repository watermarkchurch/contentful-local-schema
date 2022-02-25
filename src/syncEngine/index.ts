import type { ContentfulClientApi } from "contentful";
import { SyncItem } from "../util";


export interface Syncable {
  getToken(): string | undefined | null | Promise<string | undefined | null>
  setToken(token: string): void | Promise<void>
  index(syncItem: SyncItem): void | Promise<void>
}

export default class SyncEngine {

  constructor(
    private readonly dataSource: Syncable,
    private readonly client: Pick<ContentfulClientApi, 'sync'>
  ) {

  }

  public async sync(): Promise<void> {
    const token = await this.dataSource.getToken()

    let collection = await this.client.sync(
      token ?
        { nextSyncToken: token } :
        { initial: true }
    );

    for(const e of collection.entries) {
      await this.dataSource.index(e)
    }
    for(const e of collection.assets) {
      await this.dataSource.index(e)
    }
    for(const e of collection.deletedEntries) {
      await this.dataSource.index(e)
    }
    for(const e of collection.deletedAssets) {
      await this.dataSource.index(e)
    }
    await this.dataSource.setToken(collection.nextSyncToken)
  }
}