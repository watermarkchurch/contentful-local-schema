import { GraphQLFieldConfigMap, GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";
import fs from 'fs-extra'
import path from 'path'
import inflection from "inflection";

import ContentTypeWriter from "./content-type-writer";
import type { ContentType } from "../util";

interface IBaseOptions {
  logger: { debug: Console['debug'] }
}

type IOptions = IBaseOptions & (
  {
    directory: string
    filename: string
  } | {
    contentTypes: ContentType[]
  }
)

export default class SchemaBuilder {
  private readonly options: Readonly<IOptions>

  constructor(options?: Partial<IOptions>) {
    const opts: IOptions = Object.assign({
      directory: '.',
      filename: 'contentful-schema.json',
      logger: console,
    } as IOptions, options)

    this.options = opts
  }

  public async build(): Promise<GraphQLSchema> {
    let contentfulSchema: { contentTypes: ContentType[] }
    if ('contentTypes' in this.options) {
      contentfulSchema = { contentTypes: this.options.contentTypes }
    } else {
      if (this.options.directory) {
        await fs.mkdirp(this.options.directory)
      }
      const file = path.join(this.options.directory || '.', this.options.filename)
      contentfulSchema = JSON.parse((await fs.readFile(file)).toString())
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
