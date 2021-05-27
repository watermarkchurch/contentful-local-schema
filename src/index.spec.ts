import { ApolloClient, gql, InMemoryCache, Resolvers } from "@apollo/client";
import { GraphQLSchema } from "graphql";
import path from "path";

import { createLocalResolvers, createSchema } from ".";
import { ContentfulDataSource } from "./dataSource";
import { InMemoryDataSource } from "./dataSource/in-memory-data-source";

const fixture = require("../__fixtures__/contentful-export-2021-05-07T16-34-28.json");

describe("integration", () => {
  describe("Apollo client w/ local resolvers", () => {
    let schema: GraphQLSchema;
    let dataSource: ContentfulDataSource;
    let resolvers: Resolvers;
    let client: ApolloClient<any>;

    beforeEach(async () => {
      const options = {
        filename: path.join(
          __dirname,
          "../__fixtures__/contentful-schema.json"
        ),
      };
      schema = await createSchema(options);
      const ds = new InMemoryDataSource();
      fixture.entries.forEach((e: any) => ds.index(e));
      fixture.assets.forEach((a: any) => ds.index(a));
      dataSource = ds;

      resolvers = await createLocalResolvers(dataSource, options);

      client = new ApolloClient({
        cache: new InMemoryCache(),
        link: { request: jest.fn() } as any,
        typeDefs: schema as any,
        resolvers,
      });
    });

    describe("single entry query", () => {
      it("gets item", async () => {
        const result = await client.query({
          query: gql`
            query getevent($id: string!) {
              event(id: $id) @client {
                sys {
                  id
                }
                title
                summary
                eventType
                capacity
              }
            }
          `,
          variables: {
            id: "7cnBLR2aRp2TZcFTfC6cxs",
          },
        });

        expect(result.errors).toBeUndefined();
        const { event } = result.data;
        expect(event.sys.id).toEqual("7cnBLR2aRp2TZcFTfC6cxs");
        expect(event.title).toEqual("Worship Arts Workshop (Cont.)");
        expect(event.summary).toBeUndefined();
        expect(event.eventType).toEqual("Workshop");
        expect(event.capacity).toBeUndefined();
      });

      it("resolves included single entry", async () => {
        const result = await client.query({
          query: gql`
            query getevent($id: string!) {
              event(id: $id) @client {
                location {
                  sys {
                    id
                  }
                  title
                }
              }
            }
          `,
          variables: {
            id: "7cnBLR2aRp2TZcFTfC6cxs",
          },
        });

        expect(result.errors).toBeUndefined();
        const { event } = result.data;
        expect(event.location.sys.id).toEqual("6gCbSxnYr0XJ8DYSkalHZG");
        expect(event.location.title).toEqual("West Tower 3rd Floor South");
      });

      it("resolves included single asset", async () => {
        const result = await client.query({
          query: gql`
            query getevent($id: string!) {
              event(id: $id) @client {
                art {
                  sys {
                    id
                  }
                  title
                  fileName
                  contentType
                  url
                  size
                  width
                  height
                }
              }
            }
          `,
          variables: {
            id: "5BStqwmGPFkPSZ0Fz8xJs6",
          },
        });

        expect(result.errors).toBeUndefined();
        const { event } = result.data;
        expect(event.art.sys.id).toEqual("5JRnRQw8pWe1O9gJCKTn0B");
        expect(event.art.title).toEqual("Regen-showcase");
        expect(event.art.fileName).toEqual("ReGen App Header.jpg");
        expect(event.art.contentType).toEqual("image/jpeg");
        expect(event.art.url).toEqual(
          "//images.ctfassets.net/xxxxxx/5JRnRQw8pWe1O9gJCKTn0B/ed33a0f3ef82eca68bdd3197fc8fb5a1/ReGen_App_Header.jpg"
        );
        expect(event.art.size).toEqual(1374456);
        expect(event.art.width).toEqual(4167);
        expect(event.art.height).toEqual(2917);
      });

      it("resolves included collection", async () => {
        const result = await client.query({
          query: gql`
            query getevent($id: string!) {
              event(id: $id) @client {
                speakers {
                  total
                  items {
                    name
                  }
                }
              }
            }
          `,
          variables: {
            id: "BLzxmjyZCS9UGkRevVnIS",
          },
        });

        expect(result.errors).toBeUndefined();
        const { event } = result.data;
        expect(event.speakers.total).toEqual(2);
        expect(event.speakers.items.map((i: any) => i.name)).toEqual([
          "C W",
          "A N",
        ]);
      });

      it("resolves included asset collection", async () => {
        const result = await client.query({
          query: gql`
            query getevent($id: string!) {
              event(id: $id) @client {
                downloads {
                  total
                  items {
                    url
                  }
                }
              }
            }
          `,
          variables: {
            id: "3H6BnqBn8Dhz1jZAuET34c",
          },
        });

        expect(result.errors).toBeUndefined();
        const { event } = result.data;
        expect(event.downloads.total).toEqual(2);
        expect(event.downloads.items.map((i: any) => i.url))
          .toEqual([
            "//assets.ctfassets.net/xxxxxx/6l9xCGZA3CbmeRr21t1DK9/842e618b05e817e7a622cb3438359ccc/CLC2021-SocialMediaOverview.pdf",
            "//assets.ctfassets.net/xxxxxx/Ezf3U7innNmCIbsjGnNCg/cb900bb72bca8c69b12a4072904e935b/CLC2021-SocialPlatformsBestPractices.pdf",
          ])
      });
    });

    describe('single asset query', () => {
      it("gets item", async () => {
        const result = await client.query({
          query: gql`
            query getAsset($id: string!) {
              asset(id: $id) @client {
                sys {
                  id
                }
                title
                description
                fileName
                contentType
                url
                size
                width
                height
              }
            }
          `,
          variables: {
            id: "36SvzmmQXUW5naOO1iN2oY",
          },
        });

        expect(result.errors).toBeUndefined();
        const { asset } = result.data;
        expect(asset.sys.id).toEqual("36SvzmmQXUW5naOO1iN2oY");
        expect(asset.title).toEqual("Test Image");
        expect(asset.description).toEqual("test image description");
        expect(asset.fileName).toEqual("heros-journey-circle.jpg");
        expect(asset.contentType).toEqual("image/jpeg");
        expect(asset.url).toEqual("//images.ctfassets.net/xxxxxx/36SvzmmQXUW5naOO1iN2oY/d6044773b6254cc22538c71ee1f59eb4/heros-journey-circle.jpg");
        expect(asset.size).toEqual(118542);
        expect(asset.width).toEqual(450);
        expect(asset.height).toEqual(450);
      })
    })
  });
});
