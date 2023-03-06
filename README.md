# Contentful Local Schema

[![Build status](https://github.com/watermarkchurch/contentful-local-schema/actions/workflows/ci.yml/badge.svg)](https://github.com/watermarkchurch/contentful-local-schema/actions)
[![codecov](https://codecov.io/gh/watermarkchurch/contentful-local-schema/branch/master/graph/badge.svg?token=5BA3HYCLM2)](https://codecov.io/gh/watermarkchurch/contentful-local-schema)
[![npm version](https://badge.fury.io/js/contentful-local-schema.svg)](https://www.npmjs.com/package/contentful-local-schema)

This package contains a number of utilities that allow you to sync a small Contentful space and query it in-memory
without having to hit the Contentful API for every query.

This is very useful in react-native to keep a local offline copy of your content so you can power your app even when
users have a spotty connection.

## Configuring your data source

This library ships with a single DataSource implementation, the [InMemoryDataSource](./src/dataSource/in-memory-data-source.ts).
This data source is updated by calling the `index` method with data from the Sync API, and it exposes query methods to
query data from the in-memory `Map` objects that hold the entries and assets.

The library also provides wrappers to keep the Data Source up to date with Contentful Sync, and back it up to something like AsyncStorage for react-native.

### react-native example
```ts 
import { createSimpleClient, InMemoryDataSource, withSync, withBackup } from 'contentful-local-schema'
import AsyncStorage from '@react-native-community/async-storage';

const dataSource = new InMemoryDataSource();

const spaceId = process.env.CONTENTFUL_SPACEID;
const environmentId = process.env.CONTENTFUL_ENVIRONMENT || 'master';
const contentfulClient = createSimpleClient({
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  space: spaceId,
  environmentId,
});

// Wrap your in-memory data source to enable Syncing
export const enhancedDataSource = withSync(
  // Wrap your in-memory data source to enable backup/restore to AsyncStorage
  withBackup(
    dataSource,
    AsyncStorage,
    `contentful/${spaceId}/${environmentId}`
  ),
  contentfulClient
);

/**
 * Wraps the `sync` and `backup` functions to execute a resync on demand.
 * The react integration handles this for you.
 */ 
export const resyncContentful = () => {
  const syncPromise = enhancedDataSource.sync();
  // In the background, after the sync finishes, backup to AsyncStorage.
  // If this fails, we don't really care because at least the sync succeeded.
  syncPromise.then(() => enhancedDataSource.backup()).catch((ex) => {
    console.error('Post-sync backup failed', ex);
  });

  return syncPromise;
};

// Cold startup: import the initial state from async storage.  This returns
// a promise that can be awaited in your initializers.
const ensureContentfulLoaded = enhancedDataSource.restore();
  .then(
    () => resyncContentful(),
    (ex) => {
      console.error('Restore failed, executing full sync', ex);
      return resyncContentful();
    }
  )
  .catch((ex) => {
    console.error('sync failed', ex);
    throw ex;
  });
```

## Usage with React

The `contentful-local-schema/react` library provides a set of React hooks to easily query your InMemoryDataSource.
To get started, import and mount the provider:

```tsx
import { LocalSchemaProvider } from 'contentful-local-schema/react'
import { SplashScreen } from './screens/splashScreen'

// Import your dataSource that you configured above
import { dataSource } from './dataSource';

export function App() {

  return <LocalSchemaProvider
      dataSource={dataSource}
      Loading={SplashScreen}
    >
    <Router>
      ...
    </Router>
  </LocalSchemaProvider>
}
```

Then in your individual screens, query the data source:

```tsx

export function Home() {
  const [announcements, { loading, error, refreshing }, refresh] = useQueryEntries('announcements')

  return <FlatList
    refreshing={loading || refreshing}
    onRefresh={refresh}
    data={announcements?.items || []}
    renderItem={({ item }) => <Item {...item} />}>
  </FlatList>
}

export function Announcement({id}: {id: string}) {
  const [entry, { loading }] = useFindEntry(id)

  // Note: entry is undefined until it finishes loading
  return <View>
    <H4>{entry?.fields?.title}</H4>
    ...
  </View>
}
```

## Usage with GraphQL

The `contentful-local-schema/graphql` package exposes utilities to create a local
GraphQL schema and resolvers that can be queried using the `@client` directive.
See https://www.apollographql.com/docs/react/local-state/local-resolvers/ for details.

Ensure you have the GraphQL peer dependencies installed
```bash
$ npm install graphql graphql-type-json
```

Next, download the 'contentful-schema.json' file and commit it to your project repo:
```bash
$ npx contentful-local-schema
$ git add ./contentful-schema.json
$ git commit
```

Then, use the utilities to load the schema with resolvers into your Apollo client:
```ts
import { createLocalResolvers, createSchema } from "contentful-local-schema/graphql";
import { ApolloClient, gql, InMemoryCache } from "@apollo/client";

// Import your dataSource that you configured above
import { dataSource } from './dataSource';

// Create the schema
const schema: GraphQLSchema = await createSchema()

// Build the local resolvers around the data source
const resolvers = await createLocalResolvers(dataSource);

// Build the Apollo client from the schema and local resolvers
export const apolloClient = new ApolloClient({
  cache: new InMemoryCache(),
  link: { request: jest.fn() } as any,
  typeDefs: schema as any,
  resolvers,
});
```

Then you can easily query your apollo client
```ts
// Query the apollo client
const result = await apolloClient.query({
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

