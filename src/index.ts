import type { Resolvers } from "@apollo/client"
import { GraphQLSchema } from "graphql"
import { ContentfulDataSource } from "./dataSource"
import defaults from "./defaults"
import ResolverBuilder from "./resolver-builder"
import SchemaBuilder, { SchemaBuilderOptions } from "./schema-builder"
import { SchemaDownloader, SchemaDownloaderOptions } from "./schema-downloader"

/**
 * Downloads the Contentful schema via the management API and creates
 * the contentful-schema.json file.
 * 
 * 
 * @param options 
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
 * @param options 
 * @returns 
 */
export async function createSchema(
  options?: Partial<SchemaBuilderOptions>
): Promise<GraphQLSchema> {
  return await new SchemaBuilder({
    ...defaults,
    ...options
  }).build()
}

export async function createLocalResolvers(
  dataSource: ContentfulDataSource,
  options?: Partial<SchemaBuilderOptions>
): Promise<Resolvers> {
  return await new ResolverBuilder(
    dataSource,
    {
      ...defaults,
      ...options
    }
  ).build()
}