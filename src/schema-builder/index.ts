import { GraphQLFieldConfigMap, GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";
import inflection from "inflection";
import fs from 'fs'

import ContentTypeWriter from "./content-type-writer";
import type { ContentType } from "../util";

interface BaseOptions {
}

export type SchemaBuilderOptions = 
  {
    /**
     * The name of the schema file.  Defaults to 'contentful-schema.json'.
     */
     filename: string
  } | {
    contentTypes: ContentType[]
  }


export default class SchemaBuilder {

  public build(options: SchemaBuilderOptions): GraphQLSchema {
    let contentfulSchema: { contentTypes: ContentType[] }
    if ('contentTypes' in options) {
      contentfulSchema = { contentTypes: options.contentTypes }
    } else {
      contentfulSchema = JSON.parse(fs.readFileSync(options.filename).toString())
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
