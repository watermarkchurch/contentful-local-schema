import { SyncItem } from "../dataSource";
import { Syncable } from "../syncEngine";
import { present } from "../util";

export interface Exportable {
  /**
   * Exports the current state of the data source to a backup key-value store
   */
  export(): Generator<SyncItem, void, void> | AsyncGenerator<SyncItem, void, void>
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
  backup(): Promise<void>
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
export function withBackup<TDataSource extends Exportable & Syncable>(
  dataSource: TDataSource,
  storage: WritableKeyValueStorage & ReadableKeyValueStorage,
  prefix: string
): TDataSource & DataSourceWithBackup {
  return Object.assign(
    dataSource,
    {
      backup: backup.bind(dataSource),
      restore: restore.bind(dataSource)
    }
  )

  async function backup(): Promise<void> {
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

  async function restore(this: Syncable): Promise<void> {
    const [data, token] = await Promise.all([
      storage.getItem(`${prefix}/entries`),
      storage.getItem(`${prefix}/token`)
    ])

    if (!data) { return }

    const entries = JSON.parse(data) as SyncItem[]
    for(const e of entries) {
      await dataSource.index(e)
    }
    if (present(token)) {
      await dataSource.setToken(token)
    }
  }
}