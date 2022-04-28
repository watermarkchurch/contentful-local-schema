# Contentful Local Schema

[![Build status](https://github.com/watermarkchurch/contentful-local-schema/actions/workflows/ci.yml/badge.svg)](https://github.com/watermarkchurch/contentful-local-schema/actions)
[![codecov](https://codecov.io/gh/watermarkchurch/contentful-local-schema/branch/master/graph/badge.svg?token=5BA3HYCLM2)](https://codecov.io/gh/watermarkchurch/contentful-local-schema)
[![npm version](https://badge.fury.io/js/contentful-local-schema.svg)](https://www.npmjs.com/package/contentful-local-schema)

The `contentful-local-schema` package exposes utilities to create a local
GraphQL schema and resolvers that can be queried using the `@client` directive.
See https://www.apollographql.com/docs/react/local-state/local-resolvers/ for details.

## Usage

First, download the 'contentful-schema.json' file and commit it to your project repo:
```bash
$ npx contentful-local-schema
$ git add ./contentful-schema.json
$ git commit
```

Next, use the utilities to load the schema with resolvers into your Apollo client:
```ts
import { createLocalResolvers, createSchema, withSync, InMemoryDataSource } from "contentful-local-schema";
import { ApolloClient, gql, InMemoryCache } from "@apollo/client";
import {createClient} from 'contentful';

// Create the schema
const schema: GraphQLSchema = await createSchema()

// Initialize the data source via Contentful sync (or some other method of your choosing)
const contentfulClient = createClient({
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  space: process.env.CONTENTFUL_SPACE_ID,
})
const dataSource = withSync(new InMemoryDataSource(), contentfulClient)
await dataSource.sync()

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
    query getEvent($id: string!) {
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

This package relies on types from `@apollo/client`.  If you
don't already have it as a peer dependency, you should install it as
dev dependencies in order to compile with Typescript.

```
npm install --save-dev @apollo/client
```

```
yarn add --dev @apollo/client
```

