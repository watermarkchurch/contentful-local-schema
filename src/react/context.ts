import React from 'react'
import { ContentfulDataSource } from '../dataSource'
import { isSyncable } from '../syncEngine'

interface LocalSchemaContext {
  dataSource: ContentfulDataSource,
  updatedAt: number
}

const context = React.createContext({
  dataSource: 'Please use the LocalSchemaProvider'
} as unknown as LocalSchemaContext)

export interface LocalSchemaProviderProps {
  dataSource: ContentfulDataSource
}

/**
 * Provides a data source to power the query hooks
 */
export function LocalSchemaProvider({children, dataSource}: React.PropsWithChildren<LocalSchemaProviderProps>) {

  const [updatedAt, setUpdatedAt] = React.useState(Date.now())

  React.useEffect(() => {
    if (isSyncable(dataSource)) {
      // Wrap the "index" method to trigger a re-render
      const originalIndex = dataSource.index
      dataSource.index = (syncItem) => {
        originalIndex.call(dataSource, syncItem)
        setUpdatedAt(Date.now())
      }
    }
  }, [dataSource])

  return React.createElement(context.Provider, {
    value: {
      dataSource: dataSource,
      updatedAt
    }
  }, children)
}

export function useDataSource() {
  const ctx = React.useContext(context)

  return [ctx.dataSource, ctx.updatedAt] as const
}