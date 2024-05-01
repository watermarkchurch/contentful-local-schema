import { isError } from 'lodash'
import { SyncItem } from '../contentful/types'
import { isImportable } from '../backup'

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
  /**
   * Applies a single synced change of an entry or asset to the data source.
   * The current state of the Contentful space can be reconstructed by applying
   * all changes in the order they were received.
   * 
   * @param syncItem The entry or asset which has changed, received from the Sync API.
   */
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
        if (isImportable(this.dataSource)) {
          return await this.fullResync()
        }
      }
      throw e
    }

    const allItems = iterateCollection(collection)
    // We don't use "import" during normal sync, because we only get back the entries and assets that changed.
    for(const item of allItems) {
      await this.dataSource.index(item)
    }

    await this.dataSource.setToken(collection.nextSyncToken)
  }

  public async fullResync(): Promise<void> {
    // We have to use "import" during a full resync, because the full resync doesn't include deletedEntries or deletedAssets.
    // So if some entries or assets were unpublished between the last successful sync and now, the only way to clear
    // them from the data source is to use "import".
    if (!isImportable(this.dataSource)) { throw new Error('Data source does not support full resync, the "import" method must be implemented.') }
      
    const collection = await this.client.sync({ initial: true })

    const allItems = iterateCollection(collection)
    await this.dataSource.import(allItems, collection.nextSyncToken)
  
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
): DataSource & Pick<SyncEngine, 'sync' | 'fullResync'> {
  const syncEngine = new SyncEngine(dataSource, client)

  return Object.assign(dataSource, {
    sync: syncEngine.sync.bind(syncEngine),
    fullResync: syncEngine.fullResync.bind(syncEngine)
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
): asserts dataSource is DataSource & Pick<SyncEngine, 'sync' | 'fullResync'> {
  withSync(dataSource, client)
}

export function isSyncable(dataSource: any): dataSource is Syncable {
  return typeof dataSource.index === 'function'
}

export function hasSync(dataSource: any): dataSource is Pick<SyncEngine, 'sync'> {
  return typeof dataSource.sync === 'function'
}
