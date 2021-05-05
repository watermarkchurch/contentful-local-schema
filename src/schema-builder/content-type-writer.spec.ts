import { GraphQLObjectType, GraphQLSchema, printSchema } from "graphql";
import ContentTypeWriter from "./content-type-writer";

describe("ContentTypeWriter", () => {
  it("writes a simple type", () => {
    const instance = new ContentTypeWriter(
      {
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
      } as any,
      new Map(),
      new Map()
    );

    const { type, collection } = instance.write();

    expect(printObject(type, collection)).toMatchInlineSnapshot(`
      "type Query {
        SectionBlockText: SectionBlockText
        SectionBlockTextCollection: SectionBlockTextCollection
      }

      type SectionBlockText implements Entry {
        internalTitle: Never
        body: String!
        bookmarkTitle: String
        style: SectionBlockTextStyle
      }

      interface Entry {
        sys: Sys
        contentfulMetadata: ContentfulMetadata
      }

      type Sys {
        id: String
        spaceId: String
        environmentId: String
      }

      type ContentfulMetadata {
        tags: [ContentfulTag]!
      }

      type ContentfulTag {
        id: String!
        name: String!
      }

      scalar Never

      enum SectionBlockTextStyle {
        default
        narrow
      }

      type SectionBlockTextCollection {
        skip: Int!
        limit: Int!
        total: Int!
        items: [SectionBlockText]!
      }
      "
    `);
  });

  it("writes assets", () => {
    const instance = new ContentTypeWriter(
      {
        sys: {
          id: "section-carousel",
          type: "ContentType",
        },
        displayField: "internalTitle",
        name: "Section: Carousel",
        description:
          "Renders a carousel of images that automatically progresses from one to the next",
        fields: [
          ,
          {
            id: "images",
            name: "Images",
            type: "Array",
            localized: false,
            required: false,
            validations: [
              {
                size: {
                  min: 1,
                  max: null,
                },
              },
            ],
            disabled: false,
            omitted: false,
            items: {
              type: "Link",
              validations: [
                {
                  linkMimetypeGroup: ["image"],
                },
                {
                  assetFileSize: {
                    min: null,
                    max: 20971520,
                  },
                },
              ],
              linkType: "Asset",
            },
          },
          {
            id: "slideInterval",
            name: "Slide Interval (Seconds)",
            type: "Number",
            localized: false,
            required: false,
            validations: [
              {
                range: {
                  min: 1,
                  max: null,
                },
              },
            ],
            disabled: false,
            omitted: false,
          },
        ],
      } as any,
      new Map(),
      new Map()
    );

    const { type, collection } = instance.write();

    expect(printObject(type, collection)).toMatchInlineSnapshot(`
      "type Query {
        SectionCarousel: SectionCarousel
        SectionCarouselCollection: SectionCarouselCollection
      }

      type SectionCarousel implements Entry {
        images: AssetCollection
        slideInterval: Float
      }

      interface Entry {
        sys: Sys
        contentfulMetadata: ContentfulMetadata
      }

      type Sys {
        id: String
        spaceId: String
        environmentId: String
      }

      type ContentfulMetadata {
        tags: [ContentfulTag]!
      }

      type ContentfulTag {
        id: String!
        name: String!
      }

      type AssetCollection {
        skip: Int!
        limit: Int!
        total: Int!
        items: [Asset]!
      }

      type Asset {
        sys: Sys
        contentfulMetadata: ContentfulMetadata
        title: String
        description: String
        contentType: String
        fileName: String
        url: String
        size: Int
        width: Int
        height: Int
      }

      type SectionCarouselCollection {
        skip: Int!
        limit: Int!
        total: Int!
        items: [SectionCarousel]!
      }
      "
    `);
  });

  it("writes links", () => {
    const map = new Map();
    ["PageMetadata", "SectionBlockText", "SectionCarousel"].forEach((type) =>
      map.set(type, new GraphQLObjectType({ name: `${type}Fake`, fields: {} }))
    );

    const instance = new ContentTypeWriter(
      {
        sys: {
          id: "page",
          type: "ContentType",
        },
        displayField: "internalTitle",
        name: "Page",
        description:
          "A page describes a collection of sections that correspondto a URL slug",
        fields: [
          {
            id: "title",
            name: "Title",
            type: "Symbol",
            localized: false,
            required: true,
            validations: [],
            disabled: false,
            omitted: false,
          },
          {
            id: "subpages",
            name: "Subpages",
            type: "Array",
            localized: false,
            required: false,
            validations: [],
            disabled: false,
            omitted: false,
            items: {
              type: "Link",
              validations: [
                {
                  linkContentType: ["page"],
                },
              ],
              linkType: "Entry",
            },
          },
          {
            id: "meta",
            name: "Meta",
            type: "Link",
            localized: false,
            required: false,
            validations: [
              {
                linkContentType: ["pageMetadata"],
              },
            ],
            disabled: false,
            omitted: false,
            linkType: "Entry",
          },
          {
            id: "sections",
            name: "Sections",
            type: "Array",
            localized: false,
            required: false,
            validations: [],
            disabled: false,
            omitted: false,
            items: {
              type: "Link",
              validations: [
                {
                  linkContentType: ["section-block-text", "section-carousel"],
                },
              ],
              linkType: "Entry",
            },
          },
          {
            id: "flags",
            name: "Flags",
            type: "Array",
            localized: false,
            required: false,
            validations: [],
            disabled: false,
            omitted: false,
            items: {
              type: "Symbol",
              validations: [
                {
                  in: ["Not Shareable", "Set Campus Cookie"],
                },
              ],
            },
          },
        ],
      } as any,
      map,
      new Map()
    );

    const { type, collection } = instance.write();

    expect(printObject(type, collection)).toMatchInlineSnapshot(`
      "type Query {
        Page: Page
        PageCollection: PageCollection
      }

      type Page implements Entry {
        title: String!
        subpages: PageCollection
        meta: PageMetadataFake
        sections: PageSectionCollection
        flags: [PageFlag]
      }

      interface Entry {
        sys: Sys
        contentfulMetadata: ContentfulMetadata
      }

      type Sys {
        id: String
        spaceId: String
        environmentId: String
      }

      type ContentfulMetadata {
        tags: [ContentfulTag]!
      }

      type ContentfulTag {
        id: String!
        name: String!
      }

      type PageCollection {
        skip: Int!
        limit: Int!
        total: Int!
        items: [Page]!
      }

      type PageMetadataFake

      type PageSectionCollection {
        skip: Int!
        limit: Int!
        total: Int!
        items: [PageSection]!
      }

      union PageSection = SectionBlockTextFake | SectionCarouselFake

      type SectionBlockTextFake

      type SectionCarouselFake

      enum PageFlag {
        Not Shareable
        Set Campus Cookie
      }
      "
    `);
  });
});

function printObject(...objects: GraphQLObjectType[]) {
  const schema = new GraphQLSchema({
    query: new GraphQLObjectType(
      objects.reduce(
        (config, obj) => {
          config.fields[obj.name] = { type: obj };
          return config;
        },
        {
          name: "Query",
          fields: {} as { [key: string]: { type: GraphQLObjectType } },
        }
      )
    ),
  });

  return printSchema(schema);
}
