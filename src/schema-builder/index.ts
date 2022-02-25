import { GraphQLFieldConfigMap, GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";
import path from 'path'
import inflection from "inflection";

import ContentTypeWriter from "./content-type-writer";
import type { ContentType } from "../util";

interface BaseOptions {
}

export type SchemaBuilderOptions = BaseOptions & (
  {
    /**
     * The directory where the schema file is located.  Defaults to
     * the local directory.
     */
    directory: string
    /**
     * The name of the schema file.  Defaults to 'contentful-schema.json'.
     */
     filename: string
  } | {
    contentTypes: ContentType[]
  }
)

export default class SchemaBuilder {
  private readonly options: Readonly<SchemaBuilderOptions>

  constructor(options?: Partial<SchemaBuilderOptions>) {
    const opts: SchemaBuilderOptions = Object.assign({
      directory: '.',
      filename: 'contentful-schema.json',
      logger: console,
    } as SchemaBuilderOptions, options)

    this.options = opts
  }

  public build(): GraphQLSchema {
    let contentfulSchema: { contentTypes: ContentType[] }
    if ('contentTypes' in this.options) {
      contentfulSchema = { contentTypes: this.options.contentTypes }
    } else {
      const file = path.resolve(this.options.directory || '.', this.options.filename)
      contentfulSchema = require(file)
    }

    const contentTypeMap = new Map()
    const helperTypeMap = new Map()
    const graphQLTypes = contentfulSchema.contentTypes.map((ct) =>
      new ContentTypeWriter(ct, contentTypeMap, helperTypeMap).write())

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
      }, {} as GraphQLFieldConfigMap<any, any>)
    })

    return new GraphQLSchema({
      query: Query
    })
  }
}
