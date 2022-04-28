import type { ApolloCache } from '@apollo/client'
import { SyncItem } from '../dataSource'
import { Syncable } from '../syncEngine'
import { namespacedTypeName } from '../types'
import { idToName } from '../util'

export function withCacheEviction<DataSource extends Syncable>(
  dataSource: DataSource,
  cache: Pick<ApolloCache<any>, 'evict'>,
  options: {
    namespace: string,
    queryNamespace: string
  }
) {
  const originalIndex = dataSource.index

  dataSource.index = async (syncItem: SyncItem) => {
    await originalIndex.call(dataSource, syncItem)

    let id = ''
    switch (syncItem.sys.type) {
    case 'DeletedAsset':
    case 'Asset':
      id = `${namespacedTypeName('Asset', options.namespace)}:${syncItem.sys.id}`
      break
    case 'Entry':
    {
      const typeName = idToName(syncItem.sys.contentType?.sys?.id || 'Asset')
      id = `${namespacedTypeName(typeName, options.namespace)}:${syncItem.sys.id}`
      break
    }
    case 'DeletedEntry':
      // how to find the cache ID?
      return
    }

    cache.evict({id})    
  }
  
  return dataSource
}