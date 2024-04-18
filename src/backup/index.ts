import type { SyncItem } from '../contentful/types'
import { Syncable } from '../syncEngine'
import { present } from '../util'

export interface Exportable {
  /**
   * Exports the current state of the data source to a backup key-value store
   */
  export(): Generator<SyncItem, void, void> | AsyncGenerator<SyncItem, void, void>
  
  /**
   * Imports the current state of the data source from a backup key-value store, replacing any existing data
   * 
   * The import should be atomically committed once the generator completes
   * (i.e. without yielding to the event loop (i.e. no async during the commit)).
   */
  import(
    items: Iterable<SyncItem> | AsyncIterable<SyncItem>,
    token: string | null
  ): void | Promise<void>
}

/**
 * The writable part of the AsyncStorage interface
 */
export interface WritableKeyValueStorage {
  setItem: (key: string, value: string) => Promise<void>;
}

/**
 * The readable part of the AsyncStorage interface
 */
export interface ReadableKeyValueStorage {
  getItem: (key: string) => Promise<string | null>;
}

/**
 * 
 */
export interface DataSourceWithBackup {
  /**
   * Initiates a backup of the data source to the configured key-value store
   */
  backup(): Promise<void>
  /**
   * Restores the data source from the configured key-value store
   */
  restore(): Promise<void>
}

/**
 * Enhances a DataSource with AsyncStorage to make a convenient backup and
 * restore system.
 * @param dataSource The data source with canonical data eg InMemoryDataSource
 * @param storage A Key-Value Pair storage system like AsyncStorage
 * @param prefix The key prefix under which to store the data
 * @returns The same DataSource enhanced with the backup() and restore() methods
 */
export function addBackup<TDataSource extends Exportable & Syncable>(
  dataSource: TDataSource,
  storage: WritableKeyValueStorage & ReadableKeyValueStorage,
  prefix: string
): asserts dataSource is TDataSource & DataSourceWithBackup {
  withBackup(dataSource, storage, prefix)
}

/**
 * Enhances a DataSource with AsyncStorage to make a convenient backup and
 * restore system.
 * @param dataSource The data source with canonical data eg InMemoryDataSource
 * @param storage A Key-Value Pair storage system like AsyncStorage
 * @param prefix The key prefix under which to store the data
 * @returns The same DataSource enhanced with the backup() and restore() methods
 */
export function withBackup<TDataSource extends Exportable & Syncable>(
  dataSource: TDataSource,
  storage: WritableKeyValueStorage & ReadableKeyValueStorage,
  prefix: string
): TDataSource & DataSourceWithBackup {

  return Object.assign(
    dataSource,
    {
      backup: wrapBackupFn(dataSource),
      restore: wrapRestoreFn(dataSource)
    }
  )

  function wrapBackupFn(dataSource: TDataSource): () =>Promise<void> {
    return async () => {
      const iterator = dataSource.export()

      // TODO: batch this by size into multiple pages due to 2mb entry size limit
      // https://react-native-async-storage.github.io/async-storage/docs/limits/
      const batch: SyncItem[] = []
      for await (const item of iterator) {
        batch.push(item)
      }
      
      const token = await dataSource.getToken()
      await Promise.all([
        storage.setItem(`${prefix}/entries`, JSON.stringify(batch)),
        storage.setItem(`${prefix}/token`, token || '')
      ])
    }
  }

  function wrapRestoreFn(dataSource: TDataSource): () => Promise<void> {
    return async () => {
      const [data, token] = await Promise.all([
        storage.getItem(`${prefix}/entries`),
        storage.getItem(`${prefix}/token`)
      ])

      if (!present(data)) { return }

      const entries = JSON.parse(data) as SyncItem[]
      await dataSource.import(entries, token)
    }
  }
}

export function isExportable(dataSource: any): dataSource is Exportable {
  return typeof dataSource.export === 'function' && typeof dataSource.import === 'function'
}

export function hasBackup(dataSource: any): dataSource is DataSourceWithBackup {
  return typeof dataSource.backup === 'function' && typeof dataSource.restore === 'function'
}
