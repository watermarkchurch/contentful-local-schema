import { GraphQLFieldConfigMap, GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";
import fs from 'fs-extra'
import path from 'path'
import ContentTypeWriter from "./content-type-writer";

interface IBaseOptions {
  logger: { debug: Console['debug'] }
}

type IOptions = IBaseOptions & (
  {
    directory: string
    filename: string
  } | {
    contentTypes: any[]
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
    let contentfulSchema: { contentTypes: any[] }
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
    const graphQLTypes: GraphQLObjectType[] = contentfulSchema.contentTypes.map((ct) =>
      new ContentTypeWriter(ct, contentTypeMap).write())

    const Query = new GraphQLObjectType({
      name: 'Query',
      fields: graphQLTypes.reduce((fields, type) => {
        fields[type.name] = {
          type,
          args: {
            id: { type: GraphQLString}
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
