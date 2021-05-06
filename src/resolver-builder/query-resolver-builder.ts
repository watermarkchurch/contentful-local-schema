import type { Resolver } from "@apollo/client";
import inflection from "inflection";
import { ContentfulDataSource } from "../dataSource";
import { ContentType, idToName } from "../util";

export default class QueryResolverBuilder {

  constructor(
    private readonly dataSource: ContentfulDataSource,
    private readonly contentType: ContentType
  ) {

  }

  public build(): { Query: { [field: string]: Resolver } } {
    const resolvers: { [field: string]: Resolver } = {}
    const typeName = idToName(this.contentType.sys.id)
    const queryFieldName = inflection.camelize(typeName, true)

    resolvers[queryFieldName] = this.buildEntryResolver()
    resolvers[`${queryFieldName}Collection`] = this.buildCollectionResolver()

    return {
      Query: resolvers
    }
  }

  private buildEntryResolver(): Resolver {
    const dataSource = this.dataSource

    return async (_, args) => {
      if (!args || !args.id) { throw new Error('ID must be provided') }
      const entry = await dataSource.getEntry(args.id)
      if (!entry) {
        return null
      }
      return {
        __typename: idToName(entry.sys.contentType.sys.id),
        ...entry
      }
    }
  }

  private buildCollectionResolver(): Resolver {
    const dataSource = this.dataSource

    return async (_, args) => {
      const collection = await dataSource.getEntries()
      
      return {
        skip: collection.skip,
        limit: collection.limit,
        total: collection.total,
        items: collection.items.map((entry) => (
          {
            __typename: idToName(entry.sys.contentType.sys.id),
            ...entry
          }
        ))
      }
    }
  }
}