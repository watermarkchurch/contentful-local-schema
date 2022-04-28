import type { Resolvers } from '@apollo/client'
import { GraphQLSchema } from 'graphql'
import { ContentfulDataSource } from './dataSource'
import defaults from './defaults'
import ResolverBuilder from './resolver-builder'
import SchemaBuilder, { SchemaBuilderOptions } from './schema-builder'

export { InMemoryDataSource } from './dataSource/in-memory-data-source'
export { SyncEngine, Syncable, withSync } from './syncEngine'
export { Exportable, withBackup } from './backup'

/**
 * Creates a GraphQL schema from the given set of content types.
 * @param options (Optional) Where to locate the contentful content types to
 *   generate the GraphQL schema (default: './contentful-schema.json')
 * @returns 
 */
export function createSchema(
  options: SchemaBuilderOptions
): GraphQLSchema {
  return new SchemaBuilder(options).build()
}

/**
 * Creates a set of Apollo local resolvers around a Data Source.  The resolvers
 * include a set of Query resolvers matching the content types in the
 * contentful-schema.json file.
 * @param dataSource A queryable data source providing methods to retrieve entries
 * and assets.
 * @param options (Optional) Where to locate the contentful content types to generate
 *   the resolvers (default: './contentful-schema.json')
 * @returns 
 * @example
 *  const dataSource = withSync(new InMemoryDataSource())
 *  createLocalResolvers(dataSource)
 */
export function createLocalResolvers(
  dataSource: ContentfulDataSource,
  options?: Partial<SchemaBuilderOptions>
): Resolvers {
  return new ResolverBuilder(
    dataSource,
    {
      ...defaults,
      ...options
    }
  ).build()
}
