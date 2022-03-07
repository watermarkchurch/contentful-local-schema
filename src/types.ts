import type { Resolver } from '@apollo/client'
import type { Asset as ContentfulAsset, AssetCollection as ContentfulAssetCollection } from "contentful";
import { GraphQLFloat, GraphQLInt, GraphQLInterfaceType, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLScalarType, GraphQLString, GraphQLType } from 'graphql'
import inflection from 'inflection';

export const GraphQLNever = new GraphQLScalarType({
  name: 'Never'
})

export type Namespace = ReturnType<typeof namespace>

export function namespace(ns?: string) {
  const namespaceName = ns ? inflection.titleize(ns) : undefined

  const GraphQLLocation  = new GraphQLObjectType({
    name: toType('Location'),
    fields: {
      lat: { type: GraphQLFloat },
      lon: { type: GraphQLFloat }
    }
  })

  const Sys = new GraphQLObjectType({
    name: toType('Sys'),
    fields: {
      id: { type: GraphQLString },
      spaceId: { type: GraphQLString },
      environmentId: { type: GraphQLString },
    }
  })
  const ContentfulTag = new GraphQLObjectType({
    name: toType('ContentfulTag'),
    fields: {
      id: { type: new GraphQLNonNull(GraphQLString) },
      name: { type: new GraphQLNonNull(GraphQLString) },
    }
  })

  const ContentfulMetadata = new GraphQLObjectType({
    name: toType('ContentfulMetadata'),
    fields: {
      tags: { type: new GraphQLNonNull(new GraphQLList(ContentfulTag)) }
    }
  })

  const Entry = new GraphQLInterfaceType({
    name: toType('Entry'),
    fields: {
      sys: { type: Sys },
      contentfulMetadata: { type: ContentfulMetadata }
    }
  })

  const EntryCollection = new GraphQLObjectType({
    name: toType('EntryCollection'),
    fields: {
      skip: { type: new GraphQLNonNull(GraphQLInt) },
      limit: { type: new GraphQLNonNull(GraphQLInt) },
      total: { type: new GraphQLNonNull(GraphQLInt) },
      items: { type: new GraphQLNonNull(new GraphQLList(Entry)) }
    }
  })

  const Asset = new GraphQLObjectType({
    name: toType('Asset'),
    fields: {
      sys: { type: Sys },
      contentfulMetadata: { type: ContentfulMetadata },
      // linkedFrom: AssetLinkingCollections
      title: { type: GraphQLString },
      description: { type: GraphQLString },
      contentType: { type: GraphQLString },
      fileName: { type: GraphQLString },
      url: { type: GraphQLString },
      size: { type: GraphQLInt },
      width: { type: GraphQLInt },
      height: { type: GraphQLInt },
    }
  })

  const AssetCollection = new GraphQLObjectType({
    name: toType('AssetCollection'),
    fields: {
      skip: { type: new GraphQLNonNull(GraphQLInt) },
      limit: { type: new GraphQLNonNull(GraphQLInt) },
      total: { type: new GraphQLNonNull(GraphQLInt) },
      items: { type: new GraphQLNonNull(new GraphQLList(Asset)) }
    }
  })

  return {
    _name: namespaceName,
    Asset,
    AssetCollection,
    ContentfulMetadata,
    ContentfulTag,
    Entry,
    EntryCollection,
    Sys,
    GraphQLLocation,
    toType
  }

  function toType(name: string): string {
    return namespacedTypeName(name, namespaceName)
  }
}

export function namespacedTypeName(name: string, namespace: string | undefined) {
  if (namespace && !name.startsWith(namespace + '_')) {
    name = `${namespace}_${name}`
  }
  return name
}

export function assetFieldResolver(namespace: string | undefined): { [field: string]: Resolver } {
  const SysTypeName = namespacedTypeName('Sys', namespace)
  return {
    sys: (asset: ContentfulAsset) => {
      return {
        __typename: SysTypeName,
        ...asset.sys
      }
    },
    title: (asset: ContentfulAsset) => asset.fields.title,
    description: (asset: ContentfulAsset) => asset.fields.description,
    contentType: (asset: ContentfulAsset) => asset.fields.file?.contentType,
    fileName: (asset: ContentfulAsset) => asset.fields.file?.fileName,
    url: (asset: ContentfulAsset) => asset.fields.file?.url,
    size: (asset: ContentfulAsset) => asset.fields.file?.details?.size,
    width: (asset: ContentfulAsset) => asset.fields.file?.details?.image?.width,
    height: (asset: ContentfulAsset) => asset.fields.file?.details?.image?.height,
  }
}