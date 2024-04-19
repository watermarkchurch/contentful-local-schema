import { isError } from 'lodash';
import { SyncItem } from '../contentful/types'
import { isExportable } from '../backup';

// copied out of Contentful JS SDK
// These types are intentionally looser than our own types, to allow the user to
// pass in a Contentful client directly
interface SyncCollection {
  entries: Array<{ sys: any, fields: any }>;
  assets: Array<{ sys: any, fields: any }>;
  deletedEntries: Array<{ sys: any }>;
  deletedAssets: Array<{ sys: any }>;
  nextSyncToken: string;
}

/**
 * This interface represents any Contentful client capable of using the Sync API.
 * A simple implementation of this interface is provided by this library, but you
 * can also use the official Contentful JS SDK.
 */
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

    let collection: SyncCollection
    try {
      collection = await this.client.sync(
        token ?
          { nextSyncToken: token } :
          { initial: true }
      )
    } catch (e) {
      if (isError(e) && e.message == 'Request failed with status code 400') {
        return await this.fullResync()
      }
      throw e
    }

    const allItems = iterateCollection(collection)
    for(const item of allItems) {
      await this.dataSource.index(item)
    }

    await this.dataSource.setToken(collection.nextSyncToken)
  }

  private async fullResync(): Promise<void> {
    const collection = await this.client.sync({ initial: true })

    const allItems = iterateCollection(collection)

    if (isExportable(this.dataSource)) {
      await this.dataSource.import(allItems, collection.nextSyncToken)
    } else {
      for(const item of allItems) {
        await this.dataSource.index(item)
      }
    }
  }
}

function* iterateCollection(collection: SyncCollection): Generator<SyncItem> {
  for(const e of collection.entries) { yield e }
  for(const e of collection.assets) { yield e }
  for(const e of collection.deletedEntries) { yield e }
  for(const e of collection.deletedAssets) { yield e }
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

export function hasSync(dataSource: any): dataSource is Pick<SyncEngine, 'sync'> {
  return typeof dataSource.sync === 'function'
}
