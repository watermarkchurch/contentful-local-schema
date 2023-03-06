import type {Resolvers} from '@apollo/client'

import { ContentfulDataSource } from '../../dataSource'
import { assetFieldResolver, namespacedTypeName } from '../types'
import { ContentType } from '../../contentful/types'
import ContentTypeResolverBuilder from './content-type-resolver-builder'
import QueryResolverBuilder from './query-resolver-builder'


interface IBaseOptions {
  namespace?: string
  queryNamespace?: string

  logger: { debug: Console['debug'] },
}

type IOptions = IBaseOptions & (
  {
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
      filename: './contentful-schema.json',
      logger: console,
    } as IOptions, options)

    this.options = opts
  }

  public build(): Resolvers {
    let contentfulSchema: { contentTypes: ContentType[] }
    if ('contentTypes' in this.options) {
      contentfulSchema = { contentTypes: this.options.contentTypes }
    } else {
      contentfulSchema = require(this.options.filename)
    }
    const {namespace, queryNamespace} = this.options

    const resolvers: Resolvers = {
      ...contentfulSchema.contentTypes.reduce((types, ct) => {
        return {
          ...types,
          ...new ContentTypeResolverBuilder(this.dataSource, this.options, ct).build()
        }
      }, {})
    }

    const Query = {
      ...new QueryResolverBuilder(this.dataSource, this.options, 'Entry').build().Query,
      ...new QueryResolverBuilder(this.dataSource, this.options, 'Asset').build().Query,
      ...contentfulSchema.contentTypes.reduce((resolvers, ct) => {
        return {
          ...resolvers,
          ...new QueryResolverBuilder(this.dataSource, this.options, ct.sys.id).build().Query
        }
      }, {})
    }

    if (queryNamespace) {
      // we put the Query inside a namespaced type that we reference in the top level
      const QueryTypeName = namespacedTypeName('Query', queryNamespace)
      resolvers[QueryTypeName] = Query
      resolvers['Query'] = {}
      resolvers['Query'][queryNamespace] = () => {
        return {
          __typename: QueryTypeName,
          _id: QueryTypeName,
        }
      }
    } else {
      // we directly add our resolvers to the query
      resolvers['Query'] = Query
    }

    resolvers[namespacedTypeName('Asset', namespace)] = assetFieldResolver(namespace)

    return resolvers
  }

}
