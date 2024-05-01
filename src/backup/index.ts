import type { SyncItem } from '../contentful/types'
import { Syncable } from '../syncEngine'
import { present } from '../util'

export interface Exportable {
  /**
   * Exports the current state of the data source to a backup key-value store
   */
  export(): Generator<SyncItem, void, void> | AsyncGenerator<SyncItem, void, void>
}

export interface Importable {
  /**
   * Atomically replaces the full state of the Contentful space, replacing any existing data.
   * This is used when:
   *   - The data source is being restored from a backup
   *   - Or a full resync from Contentful is required.
   * 
   * Implementations must atomically commit the new state once the generator completes
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
      if (isImportable(dataSource)) {
        await dataSource.import(entries, token)
      } else {
        // In this case, we can fall back to the "index" method because during restore we assume the data source is empty.
        for(const item of entries) {
          await dataSource.index(item)
        }
        if (present(token)) {
          await dataSource.setToken(token)
        }
      }
    }
  }
}

export function isExportable(dataSource: any): dataSource is Exportable {
  return typeof dataSource.export === 'function'
}

export function isImportable(dataSource: any): dataSource is Importable {
  return typeof dataSource.import === 'function'
}

export function hasBackup(dataSource: any): dataSource is DataSourceWithBackup {
  return typeof dataSource.backup === 'function' && typeof dataSource.restore === 'function'
}
