import {ApolloClient, InMemoryCache, Resolver, Resolvers} from '@apollo/client'
import { GraphQLObjectType, GraphQLString } from 'graphql'
import gql from 'graphql-tag'
import { ContentfulDataSource } from '../dataSource'
import { Entry } from '../types'
import { ContentType } from '../util'
import QueryResolverBuilder from './query-resolver-builder'

describe('LocalTypePolicyBuilder', () => {
  let fakeDataSource: {
    [fn in keyof ContentfulDataSource]: jest.Mock
  }

  beforeEach(() => {
    fakeDataSource = {
      getAsset: jest.fn().mockResolvedValue(null),
      getAssets: jest.fn().mockResolvedValue({ total: 0, skip: 0, limit: 0, items: []}),
      getEntry: jest.fn(),
      getEntries: jest.fn().mockResolvedValue({ total: 0, skip: 0, limit: 0, items: []}),
    }
  })

  it('resolves a simple type', async () => {
    const schema = [
      new GraphQLObjectType({
        name: 'Query',
        fields: {
          sectionBlockText: {
            type: SectionBlockText,
            args: { id: { type: GraphQLString } }
          }
        }
      })
    ]
    fakeDataSource.getEntry.mockResolvedValue({
      sys: {
        id: '1234',
        contentType: {
          sys: {
            id: 'section-block-text'
          }
        },
        locale: 'en-US'
      },
      fields: {
        body: 'test body'
      }
    })

    // act
    const resolvers = new QueryResolverBuilder(
        fakeDataSource,
        sectionBlockTextContentType
      ).build()

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: { request: jest.fn() } as any,
      typeDefs: schema as any,
      resolvers: {
        SectionBlockText: {
          body: (entry) => entry.fields.body,
        },
        ...resolvers
      }
    })

    const result = await client.query({
      query: gql`
      query findBlockText($id: String!) {
        sectionBlockText(id:$id) @client {
          body
        }
      }
      `,
      variables: { id: '1234' }
    })

    expect(result.data.sectionBlockText).toMatchObject({
      body: 'test body'
    })
  })
})

const SectionBlockText = new GraphQLObjectType({
  name: 'SectionBlockText',
  interfaces: [Entry],
  fields: {
    body: {
      type: GraphQLString
    }
  }
})

const sectionBlockTextContentType = {
  sys: {
    id: "section-block-text",
    type: "ContentType",
  },
  displayField: "internalTitle",
  name: "Section: Block Text",
  description: "Markdown free-text block",
  fields: [
    {
      id: "internalTitle",
      name: "Internal Title (Contentful Only)",
      type: "Symbol",
      localized: false,
      required: true,
      validations: [],
      disabled: false,
      omitted: true,
    },
    {
      id: "body",
      name: "Body",
      type: "Text",
      localized: false,
      required: true,
      validations: [],
      disabled: false,
      omitted: false,
    },
    {
      id: "bookmarkTitle",
      name: "Bookmark Title",
      type: "Symbol",
      localized: true,
      required: false,
      validations: [],
      disabled: false,
      omitted: false,
    },
    {
      id: "style",
      name: "Style",
      type: "Symbol",
      localized: false,
      required: false,
      validations: [
        {
          in: ["default", "narrow"],
        },
      ],
      disabled: false,
      omitted: false,
    },
  ],
} as any as ContentType