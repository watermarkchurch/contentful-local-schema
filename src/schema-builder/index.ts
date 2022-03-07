import { GraphQLFieldConfigMap, GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";
import inflection from "inflection";

import ContentTypeWriter from "./content-type-writer";
import type { ContentType } from "../util";
import { Asset, AssetCollection } from "../types";

export type SchemaBuilderOptions = {
  contentTypes: ContentType[]
}

export default class SchemaBuilder {

  constructor(private readonly options: SchemaBuilderOptions) {
    
  }

  public build(): GraphQLSchema {
    let contentfulSchema = { contentTypes: this.options.contentTypes }

    const contentTypeMap = new Map()
    const helperTypeMap = new Map()
    const graphQLTypes = contentfulSchema.contentTypes.map((ct) =>
      new ContentTypeWriter(ct, contentTypeMap, helperTypeMap).write())

    const baseFields: GraphQLFieldConfigMap<any, any> = {
      asset: {
        type: Asset,
        args: {
          id: { type: GraphQLString}
        }
      },
      assetCollection: {
        type: AssetCollection,
        args: {
          skip: { type: GraphQLString },
          limit: { type: GraphQLString },
        }
      }
    }

    const Query = new GraphQLObjectType({
      name: 'Query',
      fields: graphQLTypes.reduce((fields, {type, collection}) => {
        const queryFieldName = inflection.camelize(type.name, true)
        fields[queryFieldName] = {
          type,
          args: {
            id: { type: GraphQLString}
          }
        }
        fields[`${queryFieldName}Collection`] = {
          type: collection,
          args: {
            skip: { type: GraphQLString },
            limit: { type: GraphQLString },
          }
        }
        return fields
      }, baseFields as GraphQLFieldConfigMap<any, any>)
    })

    return new GraphQLSchema({
      query: Query
    })
  }
}
