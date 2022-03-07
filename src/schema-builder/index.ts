import { GraphQLFieldConfigMap, GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";
import inflection from "inflection";

import ContentTypeWriter from "./content-type-writer";
import type { ContentType } from "../util";
import { namespace, Namespace } from "../types";

export type SchemaBuilderOptions = {
  contentTypes: ContentType[]

  /**
   * Wrap all types and query methods in this namespace
   */
  namespace?: string
}

export default class SchemaBuilder {

  private readonly namespace: Namespace

  constructor(private readonly options: SchemaBuilderOptions) {
    this.namespace = namespace(options.namespace)
  }

  public build(): GraphQLSchema {
    let contentfulSchema = { contentTypes: this.options.contentTypes }

    const contentTypeMap = new Map()
    const helperTypeMap = new Map()
    const graphQLTypes = contentfulSchema.contentTypes.map((ct) =>
      new ContentTypeWriter(ct, contentTypeMap, helperTypeMap, this.namespace).write())

    const baseFields: GraphQLFieldConfigMap<any, any> = {
      asset: {
        type: this.namespace.Asset,
        args: {
          id: { type: GraphQLString}
        }
      },
      assetCollection: {
        type: this.namespace.AssetCollection,
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
