import { SyncCollection } from '../contentful/types'
import { SyncItem } from '../dataSource'


export interface ContentfulClientApi {
  sync(query: any): Promise<SyncCollection>;
}

export interface Syncable {
  getToken(): string | undefined | null | Promise<string | undefined | null>
  setToken(token: string): void | Promise<void>
  index(syncItem: SyncItem): void | Promise<void>
}

export class SyncEngine {

  constructor(
    private readonly dataSource: Syncable,
    private readonly client: ContentfulClientApi
  ) {

  }

  public async sync(): Promise<void> {
    const token = await this.dataSource.getToken()

    const collection = await this.client.sync(
      token ?
        { nextSyncToken: token } :
        { initial: true }
    )

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

/**
 * Enhances a dataSource with a Contentful client to keep it up to date via the
 * Sync API.
 * @param dataSource The data source to store data e.g. InMemoryDataSource, PostgresDataSource
 * @param client The Contentful client that allows us to sync data to the data source
 * @returns The same data source enhanced with the sync() method
 */
export function withSync<DataSource extends Syncable>(
  dataSource: DataSource,
  client: Pick<ContentfulClientApi, 'sync'>
): DataSource & Pick<SyncEngine, 'sync'> {
  const syncEngine = new SyncEngine(dataSource, client)

  return Object.assign(dataSource, {
    sync: syncEngine.sync.bind(syncEngine)
  })
}


/**
 * Enhances a dataSource with a Contentful client to keep it up to date via the
 * Sync API.
 * @param dataSource The data source to store data e.g. InMemoryDataSource, PostgresDataSource
 * @param client The Contentful client that allows us to sync data to the data source
 * @returns The same data source enhanced with the sync() method
 */
export function addSync<DataSource extends Syncable>(
  dataSource: DataSource,
  client: Pick<ContentfulClientApi, 'sync'>
): asserts dataSource is DataSource & Pick<SyncEngine, 'sync'> {
  withSync(dataSource, client)
}

export function isSyncable(dataSource: any): dataSource is Syncable {
  return typeof dataSource.index === 'function'
}
