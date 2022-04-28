import type { Resolver, Resolvers } from '@apollo/client'
import { generateUUID, idToName, isLinkContentTypeValidation, present, unionTypeDefName } from '../util'
import { ContentfulDataSource } from '../dataSource'
import { namespacedTypeName } from '../types'
import { ContentType, ContentTypeField } from '../contentful/types'

export default class ContentTypeResolverBuilder {

  constructor(
    private readonly dataSource: ContentfulDataSource,
    private readonly options: { namespace?: string },
    private readonly contentType: ContentType
  ) {

  }

  public build(): Resolvers {
    const contentType = this.contentType
    const fields: { [field: string]: Resolver } = {
      sys: this.sysResolver()
    }
    const typeName = namespacedTypeName(idToName(this.contentType.sys.id), this.options.namespace)

    contentType.fields.forEach((f) => 
      fields[f.id] = this.fieldResolver(f))

    const withTypeName: Resolvers = {}
    withTypeName[typeName] = fields
    return withTypeName
  }

  private sysResolver(): Resolver {
    const SysTypeName = namespacedTypeName('Sys', this.options.namespace)
    return (entry) => {
      return {
        __typename: SysTypeName,
        _id: entry.sys.id,
        ...entry.sys
      }
    }
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
      return (entry) => entry.fields[field.id] || null
    case 'Location':
      return (entry) => ({
        __typename: 'Location',
        _id: [entry.sys.id, field.id].join('/'),
        ...entry.fields[field.id]
      })
    case 'Link':
      return this.linkResolver(field)
    case 'Array':
      if (field.items && field.items.type == 'Link') {
        return this.collectionResolver(field)
      } else {
        // Simple list - get the items
        return (entry) => entry.fields[field.id] || []
      }
    default:
      return (entry) => ({
        __typename: 'JSON',
        _id: [entry.sys.id, field.id].join('/'),
        ...entry.fields[field.id]
      })
    }
  }

  private linkResolver(field: ContentTypeField): Resolver {
    const dataSource = this.dataSource
    const {namespace} = this.options
    const AssetTypeName = namespacedTypeName('Asset', namespace)

    return async (entry) => {
      const link = entry.fields[field.id]
      if (!link) { return null }
      if (!link.sys || link.sys.type != 'Link') {
        throw new Error(`Value in field ${field.id} is not a link! (was '${link}')`)
      }

      if (field.linkType == 'Asset') {
        const resolved = await dataSource.getAsset(link.sys.id)
        if (!resolved) { return null }
        return {
          __typename: AssetTypeName,
          _id: resolved.sys.id,
          ...resolved
        }
      } else {
        const resolved = await dataSource.getEntry(link.sys.id)
        if (!resolved) { return null }
        return {
          __typename: namespacedTypeName(idToName(resolved.sys.contentType.sys.id), namespace),
          _id: resolved.sys.id,
          ...resolved
        }
      }
    }
  }

  private collectionResolver(field: ContentTypeField): Resolver {
    const dataSource = this.dataSource
    const {namespace} = this.options
    const AssetTypeName = namespacedTypeName('Asset', namespace)
    const linkType = field.items!.linkType!

    const CollectionTypeName =
      linkType == 'Asset' ?
        'AssetCollection' :
        // duplicate the logic in content-type-writer.ts for union fields
        getCollectionTypeName(
          this.contentType.sys.id,
          Object.assign({ id: field.id }, field.items),
          namespace) + 'Collection'

    return async (entry, args) => {
      const links: any[] | undefined = entry.fields[field.id]
      const linkIDs = (links || []).map((link: any) => {
        if (!link) { return null }
        if (!link.sys || link.sys.type != 'Link') {
          throw new Error(`Value in field ${field.id} is not a link! (was '${link}')`)
        }

        return link.sys.id as string
      }).filter(present)

      if (linkType == 'Asset') {
        const collection = await dataSource.getAssets({
          ...args,
          limit: linkIDs.length,
          'sys.id[in]': linkIDs
        })

        // they need to be ordered properly
        const itemsById = reduceById(collection.items)
        const items = linkIDs.map((id) => itemsById[id])

        return {
          __typename: AssetTypeName + 'Collection',
          _id: generateUUID(),
          skip: collection.skip,
          limit: collection.limit,
          total: collection.total,
          items: items.map((asset) => (
            {
              __typename: AssetTypeName,
              _id: asset.sys.id,
              ...asset
            }
          ))
        }
      }

      const collection = await dataSource.getEntries({
        ...args,
        limit: linkIDs.length,
        'sys.id[in]': linkIDs
      })

      // they need to be ordered properly
      const itemsById = reduceById(collection.items)
      const items = linkIDs.map((id) => itemsById[id])

      return {
        __typename: CollectionTypeName,
        _id: generateUUID(),
        skip: collection.skip,
        limit: collection.limit,
        total: collection.total,
        items: items.map((entry) => (
          {
            __typename: namespacedTypeName(
              idToName(entry.sys.contentType.sys.id),
              namespace
            ),
            _id: entry.sys.id,
            ...entry
          }
        ))
      }
    }
  }
}

function getCollectionTypeName(thisContentTypeId: string, field: ContentTypeField, namespace: string | undefined): string {
  if (!field) { throw new Error('Missing items!') }

  const validation = field.validations &&
      field.validations.filter(isLinkContentTypeValidation).find((v) =>
        v.linkContentType.length > 0)

  if (!validation) {
    return namespacedTypeName('Entry', namespace)
  }

  if (validation.linkContentType.length == 1) {
    return namespacedTypeName(idToName(validation.linkContentType[0]), namespace)
  }

  const unionName = namespacedTypeName(
    unionTypeDefName(
      thisContentTypeId,
      field
    ),
    namespace
  )
  return unionName
}

function reduceById<T extends { sys: { id: string } }>(entries: T[]): Record<string, T> {
  return entries.reduce((h, e) => {
    h[e.sys.id] = e
    return h
  }, {} as Record<string, T>)
}