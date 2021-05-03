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
      },
      new Map()
    );

    const gqlObject = instance.write();

    expect(printObject(gqlObject)).toMatchInlineSnapshot(`
      "type Query {
        SectionBlockText: SectionBlockText
      }

      type SectionBlockText {
        internalTitle: Never
        body: String!
        bookmarkTitle: String
        style: String
      }

      scalar Never
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
