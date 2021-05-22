# Contentful Local Schema

The `contentful-local-schema` package exposes utilities to create a local
GraphQL schema and resolvers that can be queried using the `@client` directive.
See https://www.apollographql.com/docs/react/local-state/local-resolvers/ for details.

## Usage

```ts
import { createLocalResolvers, createSchema, InMemoryDataSource } from "contentful-local-schema";
import { ApolloClient, gql, InMemoryCache } from "@apollo/client";
import {createClient} from 'contentful';

// Create the schema
const schema: GraphQLSchema = await createSchema()

// Initialize the data source by querying Contentful (or some other method)
const dataSource = new InMemoryDataSource()
const contentfulClient = createClient({
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  space: process.env.CONTENTFUL_SPACE_ID,
})
const sync = await contentfulClient.sync({ initial: true })
sync.entries.forEach((e: any) => ds.index(e));
sync.assets.forEach((a: any) => ds.index(a));

// Build the local resolvers around the data source
const resolvers = await createLocalResolvers(dataSource);

// Build the Apollo client from the schema and local resolvers
const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: { request: jest.fn() } as any,
  typeDefs: schema as any,
  resolvers,
});

// Query the apollo client
const result = await client.query({
  query: gql`
    query getevent($id: string!) {
      event(id: $id) @client {
        sys {
          id
        }
        title
      }
    }
  `,
  variables: {
    id: "1234",
  },
});

expect(result.errors).toBeUndefined();
const { event } = result.data;
expect(event.sys.id).toEqual("1234");
expect(event.title).toEqual("The event title");
```

see [src/index.spec.ts](./src/index.spec.ts) for more cool queries

## Installation:

```
npm install contentful-local-schema
```

Or with yarn
```
yarn add contentful-local-schema
```

### If using typescript:

This package relies on types from `@apollo/client` and `contentful`.  If you
don't already have these as peer dependencies, you should install them as
dev dependencies in order to compile with Typescript.

```
npm install --save-dev @apollo/client contentful
```

```
yarn add --dev @apollo/client contentful
```

