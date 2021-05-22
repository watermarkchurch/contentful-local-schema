import { ApolloClient, gql, InMemoryCache, Resolvers } from "@apollo/client"
import { GraphQLSchema } from "graphql"
import path from 'path'

import { createLocalResolvers, createSchema } from "."
import { ContentfulDataSource } from "./dataSource"
import { InMemoryDataSource } from "./dataSource/in-memory-data-source"

const fixture = require('../__fixtures__/contentful-export-2021-05-07T16-34-28.json')

describe('integration', () => {
  describe('Apollo client w/ local resolvers', () => {
    let schema: GraphQLSchema
    let dataSource: ContentfulDataSource
    let resolvers: Resolvers
    let client: ApolloClient<any>

    beforeEach(async () => {
      const options = {
        filename: path.join(__dirname, '../__fixtures__/contentful-schema.json')
      }
      schema = await createSchema(options)
      const ds = new InMemoryDataSource()
      fixture.entries.forEach((e: any) => ds.index(e))
      fixture.assets.forEach((a: any) => ds.index(a))
      dataSource = ds

      resolvers = await createLocalResolvers(dataSource, options)

      client = new ApolloClient({
        cache: new InMemoryCache(),
        link: { request: jest.fn() } as any,
        typeDefs: schema as any,
        resolvers
      })
    })

    it('queries single event', async () => {
      const result = await client.query({
        query: gql`
        query getevent($id: string!) {
          event(id: $id) @client {
            title
            summary
            eventType
            capacity
          }
        }`,
        variables: {
          id: '7cnBLR2aRp2TZcFTfC6cxs'
        }
      })

      expect(result.errors).toBeUndefined()
      const {event} = result.data
      expect(event.title).toEqual("Worship Arts Workshop (Cont.)")
      expect(event.summary).toBeUndefined()
      expect(event.eventType).toEqual('Workshop')
      expect(event.capacity).toBeUndefined()
    })
  })
})
