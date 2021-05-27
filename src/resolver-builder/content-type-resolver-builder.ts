import type { Resolver, Resolvers } from "@apollo/client";
import { ContentType, ContentTypeField, idToName, present } from "../util";
import { ContentfulDataSource } from "../dataSource";

export default class ContentTypeResolverBuilder {

  constructor(
    private readonly dataSource: ContentfulDataSource,
    private readonly contentType: ContentType
  ) {

  }

  public build(): Resolvers {
    const contentType = this.contentType
    const fields: { [field: string]: Resolver } = {}
    const typeName = idToName(this.contentType.sys.id)

    contentType.fields.forEach((f) => 
      fields[f.id] = this.fieldResolver(f))

    const withTypeName: Resolvers = {}
    withTypeName[typeName] = fields
    return withTypeName
  }

  private fieldResolver(field: ContentTypeField): Resolver {
    if (field.omitted) {
      return () => undefined
    }
    switch (field.type) {
      case 'Symbol':
      case 'Text':
      case 'Date':
      case 'Integer':
      case 'Number':
      case 'Boolean':
        return (entry) => entry.fields[field.id]
      case 'Location':
        return (entry) => ({
          __typename: 'Location',
          ...entry.fields[field.id]
        })
      case 'Link':
        return this.linkResolver(field)
      case 'Array':
        if (field.items && field.items.type == 'Link') {
          return this.collectionResolver(field)
        } else {
          // Simple list - get the items
          return (entry) => entry.fields[field.id]
        }
      default:
        return (entry) => ({
          __typename: 'JSON',
          ...entry.fields[field.id]
        })
    }
  }

  private linkResolver(field: ContentTypeField): Resolver {
    const dataSource = this.dataSource

    return async (entry) => {
      const link = entry.fields[field.id]
      if (!link) { return null }
      if (!link.sys || link.sys.type != 'Link') {
        throw new Error(`Value in field ${field.id} is not a link! (was '${link}')`)
      }

      if (field.linkType == 'Asset') {
        const resolved = await dataSource.getAsset(link.sys.id)
        return {
          __typename: 'Asset',
          ...resolved
        }
      } else {
        const resolved = await dataSource.getEntry(link.sys.id)
        return {
          __typename: idToName(entry.sys.contentType.sys.id),
          ...resolved
        }
      }
    }
  }

  private collectionResolver(field: ContentTypeField): Resolver {
    const dataSource = this.dataSource
    const linkType = field.items!.linkType!

    return async (entry, args) => {
      const links = entry.fields[field.id] as any[]
      const linkIDs = links.map((link: any) => {
        if (!link) { return null }
        if (!link.sys || link.sys.type != 'Link') {
          throw new Error(`Value in field ${field.id} is not a link! (was '${link}')`)
        }

        return link.sys.id as string
      }).filter(present)

      if (linkType == 'Asset') {
        const collection = await dataSource.getAssets({
          ...args,
          'sys.id[in]': linkIDs
        })

        return {
          skip: collection.skip,
          limit: collection.limit,
          total: collection.total,
          items: collection.items.map((entry) => (
            {
              __typename: 'Asset',
              ...entry
            }
          ))
        }
      }

      const collection = await dataSource.getEntries({
        ...args,
        'sys.id[in]': linkIDs
      })
      
      return {
        skip: collection.skip,
        limit: collection.limit,
        total: collection.total,
        items: collection.items.map((entry) => (
          {
            __typename: idToName(entry.sys.contentType.sys.id),
            ...entry
          }
        ))
      }
    }
  }
}