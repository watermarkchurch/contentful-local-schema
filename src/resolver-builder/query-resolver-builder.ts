import type { FieldReadFunction, Resolver, Resolvers, TypePolicies, TypePolicy } from "@apollo/client";
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

    resolvers[queryFieldName] = this.buildFindResolver()
    // policy[typeName] = {
    //   fields: {
    //     body: (parent, args) => {
    //       console.log('bodyResolver', parent, args)
    //     }
    //   }
    // }

    return {
      Query: resolvers
    }
  }

  private buildFindResolver(): Resolver {
    const dataSource = this.dataSource
    return async (...opts) => {
      const [_, args] = opts
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
}