import type { Resolvers } from "@apollo/client"
import type { ContentfulClientApi } from "contentful"
import { GraphQLSchema } from "graphql"
import { ContentfulDataSource } from "./dataSource"
import defaults from "./defaults"
import ResolverBuilder from "./resolver-builder"
import SchemaBuilder, { SchemaBuilderOptions } from "./schema-builder"
import { SchemaDownloader, SchemaDownloaderOptions } from "./schema-downloader"
import SyncEngine, { Syncable } from "./syncEngine"

export { InMemoryDataSource } from './dataSource/in-memory-data-source'

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
  options?: Partial<SchemaDownloaderOptions>
) {
  return await new SchemaDownloader({
    ...defaults,
    ...options
  }).downloadSchema()
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

/**
 * Wraps a dataSource with a Contentful client to keep it up to date via the
 * Sync API.
 * @param dataSource The data source to store data e.g. InMemoryDataSource, PostgresDataSource
 * @param client The Contentful client that allows us to sync data to the data source
 * @returns The same data source with an additional "sync" method
 */
export function withSync<DataSource extends Syncable>(
  dataSource: DataSource,
  client: Pick<ContentfulClientApi, 'sync'>
): DataSource & Pick<SyncEngine, 'sync'> {
  const syncEngine = new SyncEngine(dataSource, client)

  return Object.assign(dataSource, {
    sync: syncEngine.sync.bind(syncEngine)
  })
}