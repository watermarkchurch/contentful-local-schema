import type {Resolvers} from '@apollo/client'
import path from 'path'
import { ContentfulDataSource } from '../dataSource';
import type { ContentType } from '../util';
import ContentTypeResolverBuilder from './content-type-resolver-builder';
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
      const file = path.resolve(this.options.directory || '.', this.options.filename)
      contentfulSchema = require(file)
    }

    return {
      Query: {
        ...contentfulSchema.contentTypes.reduce((resolvers, ct) => {
          return {
            ...resolvers,
            ...new QueryResolverBuilder(this.dataSource, ct).build().Query
          }
        }, {})
      },
      ...contentfulSchema.contentTypes.reduce((types, ct) => {
        return {
          ...types,
          ...new ContentTypeResolverBuilder(this.dataSource, ct).build()
        }
      }, {})
    }
  }

}
