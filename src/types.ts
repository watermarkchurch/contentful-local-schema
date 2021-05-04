
import { GraphQLFloat, GraphQLInt, GraphQLInterfaceType, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLScalarType, GraphQLString } from 'graphql'

export const GraphQLNever = new GraphQLScalarType({
  name: 'Never'
})

export const GraphQLLocation  = new GraphQLObjectType({
  name: 'Location',
  fields: {
    lat: { type: GraphQLFloat },
    lon: { type: GraphQLFloat }
  }
})

export const Sys = new GraphQLObjectType({
  name: 'Sys',
  fields: {
    id: { type: GraphQLString },
    spaceId: { type: GraphQLString },
    environmentId: { type: GraphQLString },
  }
})
export const ContentfulTag = new GraphQLObjectType({
  name: 'ContentfulTag',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: new GraphQLNonNull(GraphQLString) },
  }
})

export const ContentfulMetadata = new GraphQLObjectType({
  name: 'ContentfulMetadata',
  fields: {
    tags: { type: new GraphQLNonNull(new GraphQLList(ContentfulTag)) }
  }
})

export const Entry = new GraphQLInterfaceType({
  name: 'Entry',
  fields: {
    sys: { type: Sys },
    contentfulMetadata: { type: ContentfulMetadata }
  }
})

export const Asset = new GraphQLObjectType({
  name: 'Asset',
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
