import type { Resolver } from "@apollo/client";
import inflection from "inflection";
import type { ContentfulDataSource } from "../dataSource";
import { namespacedTypeName } from "../types";
import { generateUUID, idToName } from "../util";

export default class QueryResolverBuilder {

  constructor(
    private readonly dataSource: ContentfulDataSource,
    private readonly options: { namespace?: string },
    private readonly contentTypeId: string
  ) {

  }

  public build(): { Query: { [field: string]: Resolver } } {
    const resolvers: { [field: string]: Resolver } = {}
    const typeName = idToName(this.contentTypeId)
    const queryFieldName = inflection.camelize(typeName, true)

    resolvers[queryFieldName] = this.buildEntryResolver()
    resolvers[`${queryFieldName}Collection`] = this.buildCollectionResolver()

    return {
      Query: resolvers
    }
  }

  private buildEntryResolver(): Resolver {
    const dataSource = this.dataSource
    const {namespace} = this.options

    if(this.contentTypeId == 'Asset') {
      const AssetTypeName = namespacedTypeName('Asset', namespace)

      return async (_, args) => {
        if (!args || !args.id) { throw new Error('ID must be provided') }
        const entry = await dataSource.getAsset(args.id)
        if (!entry) {
          return null
        }
        return {
          __typename: AssetTypeName,
          _id: entry.sys.id,
          ...entry
        }
      }
    }

    return async (_, args) => {
      if (!args || !args.id) { throw new Error('ID must be provided') }
      const entry = await dataSource.getEntry(args.id)
      if (!entry) {
        return null
      }
      const typename = namespacedTypeName(idToName(entry.sys.contentType.sys.id), namespace)
      return {
        __typename: typename,
        _id: entry.sys.id,
        ...entry
      }
    }
  }

  private buildCollectionResolver(): Resolver {
    const dataSource = this.dataSource
    const contentTypeId = this.contentTypeId
    const {namespace} = this.options

    if (this.contentTypeId == 'Asset') {
      const AssetTypeName = namespacedTypeName('Asset', namespace)

      return async (_, args) => {
        const collection = await dataSource.getAssets({
          ...args
        })
        
        return {
          __typename: AssetTypeName + 'Collection',
          _id: generateUUID(),
          skip: collection.skip,
          limit: collection.limit,
          total: collection.total,
          items: collection.items.map((asset) => (
            {
              __typename: AssetTypeName,
              _id: asset.sys.id,
              ...asset
            }
          ))
        }
      }
    }

    if (this.contentTypeId == 'Entry') {
      // special case - no content_type and no filters, browse all entries
      return async (_, args) => {
        const collection = await dataSource.getEntries({...args})
  
        const EntryTypeName = namespacedTypeName('Entry', namespace)
        
        return {
          __typename: EntryTypeName + 'Collection',
          _id: generateUUID(),
          skip: collection.skip,
          limit: collection.limit,
          total: collection.total,
          items: collection.items.map((entry) => {
            // each entry may be a different type
            const typename = namespacedTypeName(idToName(entry.sys.contentType.sys.id), namespace)

            return {
              __typename: typename,
              _id: entry.sys.id,
              ...entry
            }
          })
        }
      }
    }

    return async (_, args) => {
      const collection = await dataSource.getEntries({
        content_type: contentTypeId,
        ...args
      })

      const EntryTypeName = namespacedTypeName(
        idToName(contentTypeId),
        namespace
      )
      
      return {
        __typename: EntryTypeName + 'Collection',
        _id: generateUUID(),
        skip: collection.skip,
        limit: collection.limit,
        total: collection.total,
        items: collection.items.map((entry) => (
          {
            __typename: EntryTypeName,
            _id: entry.sys.id,
            ...entry
          }
        ))
      }
    }
  }
}