import type {Resolvers} from '@apollo/client'
import fs from 'fs-extra'
import path from 'path'
import { ContentfulDataSource } from '../dataSource';
import type { ContentType } from '../util';
import QueryResolverBuilder from './query-resolver-builder';


interface IBaseOptions {
  logger: { debug: Console['debug'] },
}

type IOptions = IBaseOptions & (
  {
    directory: string
    filename: string
  } | {
    contentTypes: any[]
  }
)

export default class ResolverBuilder {
  private readonly options: Readonly<IOptions>

  constructor(
    private readonly dataSource: ContentfulDataSource,
    options?: Partial<IOptions>
  ) {
    const opts: IOptions = Object.assign({
      directory: '.',
      filename: 'contentful-schema.json',
      logger: console,
    } as IOptions, options)

    this.options = opts
  }

  public async build(): Promise<Resolvers> {
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

    return {
      Query: {
        ...contentfulSchema.contentTypes.reduce((resolvers, ct) => {
          return {
            ...resolvers,
            ...new QueryResolverBuilder(this.dataSource, ct).build()
          }
        }, {})
      },
      ...contentfulSchema.contentTypes.reduce((types, ct) => {


        return types
      }, {})
    }
  }

}
