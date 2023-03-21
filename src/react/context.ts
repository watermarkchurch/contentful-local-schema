import React from 'react'
import {throttle} from 'async-toolbox/throttle'
import { ContentfulDataSource } from '../dataSource'
import { hasSync, isSyncable } from '../syncEngine'
import { hasBackup } from '../backup'
import { addResolve, DataSourceWithResolve } from '../resolve'

interface LocalSchemaContext {
  dataSource: DataSourceWithResolve,
  state: {
    /** A number that auto-increments whenever a new entry is indexed */
    revision: number,
    /** A timestamp indicating when the index method was last called to update the dataSource. */
    lastIndexedAt: number,
    /** A timestamp indicating when the resync method last completed. */
    lastSyncedAt: number,
    /** A timestamp indicating the last time that the post-sync backup completed. */
    lastBackedUpAt: number
  },
  /**
   * Directly invokes the sync method on the data source, updating the revision number.
   * If the data source supports backup, this will also trigger a backup in the background.
   * 
   * @returns A promise that resolves to the current revision number after sync completed.
   */
  resync: () => Promise<number>
}

const context = React.createContext({
  dataSource: 'Please use the LocalSchemaProvider'
} as unknown as LocalSchemaContext)

export interface LocalSchemaProviderProps {
  dataSource: ContentfulDataSource,

  /**
   * The component to render while waiting for restore from backup/sync.
   * By default, this will render an empty screen.
   */
  Loading?: React.ComponentType
}

/**
 * Provides a data source to power the query hooks
 */
export function LocalSchemaProvider({
  children,
  dataSource,
  Loading
}: React.PropsWithChildren<LocalSchemaProviderProps>) {
  // Ensure the query hooks can "resolve" entries
  addResolve(dataSource)

  const revision = React.useRef(1)
  const [lastIndexedAt, setLastIndexedAt] = React.useState(0)
  const [lastSyncedAt, setLastSyncedAt] = React.useState(0)
  const [lastBackedUpAt, setLastBackedUpAt] = React.useState(0)

  /**
   * A function to trigger a resync on-demand
   */
  const resync =
    React.useMemo<() => Promise<number>>(() => {
      if (!hasSync(dataSource)) {
        return () => { throw new Error('Sync is not supported.  Did you wrap your data source with `withSync`?') }
      }
      
      if (!hasBackup(dataSource)) {
        console.warn('No backup method found.  Did you wrap your data source with `withBackup`?')
        // No backup so all we can do is sync
        return throttle(async () => {
          await dataSource.sync()
          return revision.current
        },
        400)
      }

      return throttle(
        async () => {
          await dataSource.sync()
          // In the background, after the sync finishes, backup to AsyncStorage.
          // If this fails, we don't really care because at least the sync succeeded.
          dataSource.backup().catch((ex) => {
            console.error('Post-sync backup failed', ex)
          })

          return revision.current
        },
        400
      )
    }, [dataSource])

  const [initialized, setInitialized] = React.useState(false)
  React.useEffect(() => {
    if (initialized) { return }

    initialize(dataSource)
      .finally(() => {
        if (isSyncable(dataSource)) {
          // Wrap the "index" method to trigger a re-render
          const originalIndex = dataSource.index
          dataSource.index = async (syncItem) => {
            const result = await originalIndex.call(dataSource, syncItem)
            revision.current = (revision.current + 1) % Number.MAX_SAFE_INTEGER
            setLastIndexedAt(Date.now())
            return result
          }
        }

        if (hasSync(dataSource)) {
          // Wrap the "sync" method to keep track of when it last succeeded (for loading indicators)
          const originalSync = dataSource.sync
          dataSource.sync = async () => {
            const result = await originalSync.call(dataSource)
            setLastSyncedAt(Date.now())
            return result
          }
        }

        if (hasBackup(dataSource)) {
          // Wrap the "backup" method to keep track of when it last succeeded (for loading indicators)
          const originalBackup = dataSource.backup
          dataSource.backup = async () => {
            const result = await originalBackup.call(dataSource)
            setLastBackedUpAt(Date.now())
            return result
          }
        }

        setInitialized(true)
      })
  }, [dataSource])

  if (!initialized) {
    if (Loading) {
      return React.createElement(Loading)
    }
    return null
  }

  return React.createElement(context.Provider, {
    value: {
      dataSource,
      state: {
        revision: revision.current,
        lastIndexedAt,
        lastSyncedAt,
        lastBackedUpAt
      },
      resync
    }
  }, children)
}

export function useDataSource() {
  const ctx = React.useContext(context)

  return [ctx.dataSource, ctx.state, ctx.resync] as const
}

async function initialize(dataSource: ContentfulDataSource): Promise<void> {
  if (hasBackup(dataSource)) {
    try {
      await dataSource.restore()
    } catch (ex) {
      console.error('Restore error, falling back to full sync:', ex)
    }
  }

  if (hasSync(dataSource)) {
    try {
      await dataSource.sync()
    } catch(ex) {
      console.error('Sync error:', ex)
    }
  }
}