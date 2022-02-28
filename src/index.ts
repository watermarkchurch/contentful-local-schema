import type { Resolvers } from "@apollo/client"
import { GraphQLSchema } from "graphql"
import { ContentfulDataSource } from "./dataSource"
import defaults from "./defaults"
import ResolverBuilder from "./resolver-builder"
import SchemaBuilder, { SchemaBuilderOptions } from "./schema-builder"
import { SchemaDownloader, SchemaDownloaderOptions } from "./schema-downloader"
import type FS from 'fs'


export { InMemoryDataSource } from './dataSource/in-memory-data-source'
export { SyncEngine, Syncable, withSync } from './syncEngine'
export { Exportable, withBackup } from './backup'

/**
 * Downloads the Contentful schema via the management API and creates
 * the contentful-schema.json file.
 * 
 * 
 * @param options (Optional) Where to store the contentful content type file
 *   (default: './contentful-schema.json')
 * @returns 
 */
export async function downloadContentfulSchema(
  fs: typeof FS,
  options?: Partial<SchemaDownloaderOptions>,
) {
  return await new SchemaDownloader({
    ...defaults,
    ...options
  }).downloadSchema(fs)
}

/**
 * Creates a GraphQL schema from the given set of content types.
 * @param options (Optional) Where to locate the contentful content types to
 *   generate the GraphQL schema (default: './contentful-schema.json')
 * @returns 
 */
export function createSchema(
  options?: Partial<SchemaBuilderOptions>
): GraphQLSchema {
  return new SchemaBuilder({
    ...defaults,
    ...options
  }).build()
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
