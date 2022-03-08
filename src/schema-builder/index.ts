import { GraphQLFieldConfigMap, GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";
import inflection from "inflection";

import ContentTypeWriter from "./content-type-writer";
import { ContentType, idToName } from "../util";
import { namespace, Namespace, namespacedTypeName } from "../types";

export type SchemaBuilderOptions = {
  contentTypes: ContentType[]

  /**
   * Prefixes all types with this namespace
   */
  namespace?: string

  /**
   * Wraps all top level queries in this namespace
   */
  queryNamespace?: string
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
    const graphQLTypes = contentfulSchema.contentTypes.map((ct) => ({
      contentType: ct.sys.id,
      ...new ContentTypeWriter(ct, contentTypeMap, helperTypeMap, this.namespace).write()
    }))

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
      },
      entry: {
        type: this.namespace.Entry,
        args: {
          id: { type: GraphQLString}
        }
      },
      entryCollection: {
        type: this.namespace.EntryCollection,
        args: {
          skip: { type: GraphQLString },
          limit: { type: GraphQLString },
        }
      }
    }

    const {queryNamespace} = this.options
    const QueryTypeName = namespacedTypeName('Query', queryNamespace)
    const QueryType = new GraphQLObjectType({
      name: QueryTypeName,
      fields: graphQLTypes.reduce((fields, {contentType, type, collection}) => {
        const queryFieldName = inflection.camelize(idToName(contentType), true)
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

    if (!queryNamespace) {
      // No namespace - the Query is at the root of the schema
      return new GraphQLSchema({
        query: QueryType
      })
    }

    // A Query object with a single field that wraps up our actual Query object
    const Query = new GraphQLObjectType({
      name: 'Query',
      fields: {
        [queryNamespace]: {
          type: QueryType
        }
      }
    })
    return new GraphQLSchema({
      query: Query
    })
  }
}
