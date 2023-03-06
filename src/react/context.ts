import React from 'react'
import debounce from 'lodash/debounce'
import { ContentfulDataSource } from '../dataSource'
import { hasSync, isSyncable } from '../syncEngine'
import { hasBackup } from '../backup'
import { addInclude, DataSourceWithInclude } from '../include'

interface LocalSchemaContext {
  dataSource: DataSourceWithInclude,
  revision: number,
  resync: () => Promise<void> | undefined
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
  addInclude(dataSource)

  const [revision, setRevision] = React.useState(1)

  /**
   * A function to trigger a resync on-demand
   */
  const resync =
    React.useMemo<() => Promise<void> | undefined>(() => {
      if (!hasSync(dataSource)) {
        return () => { throw new Error('Sync is not supported.  Did you wrap your data source with `withSync`?') }
      }
      
      if (!hasBackup(dataSource)) {
        console.warn('No backup method found.  Did you wrap your data source with `withBackup`?')
        // No backup so all we can do is sync
        return debounce(
          dataSource.sync.bind(dataSource),
          400,
          { leading: true }
        )
      }

      return debounce(
        () => {
          const syncPromise = dataSource.sync()
          // In the background, after the sync finishes, backup to AsyncStorage.
          // If this fails, we don't really care because at least the sync succeeded.
          syncPromise.then(() => dataSource.backup()).catch((ex) => {
            console.error('Post-sync backup failed', ex)
          })

          return syncPromise
        },
        400,
        { leading: true }
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
          dataSource.index = (syncItem) => {
            originalIndex.call(dataSource, syncItem)
            setRevision((i) => (i + 1) % Number.MAX_SAFE_INTEGER)
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
      revision,
      resync
    }
  }, children)
}

export function useDataSource() {
  const ctx = React.useContext(context)

  return [ctx.dataSource, ctx.revision, ctx.resync] as const
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